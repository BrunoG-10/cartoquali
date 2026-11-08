-- Cadastro próprio: o cartório se cadastra pela página comercial e começa os 7 dias grátis sem
-- intervenção da plataforma. Uma única função (service_role) cria tudo de uma vez: cartório ativo,
-- administrador, atribuições, pesquisa padrão publicada e ponto com QR Code ativo. O período de
-- teste (20261021010000) começa no primeiro login, como nos cartórios implantados pela plataforma.
-- O administrador da plataforma acompanha pelo painel, que passa a mostrar a origem e o teste.

-- 1. Implantação sem administrador da plataforma por trás
alter table public.cartorio_onboarding alter column created_by_id drop not null;
alter table public.cartorio_onboarding
  add column if not exists origem text not null default 'plataforma';
alter table public.cartorio_onboarding drop constraint if exists cartorio_onboarding_origem_check;
alter table public.cartorio_onboarding
  add constraint cartorio_onboarding_origem_check check (origem in ('plataforma', 'cadastro_proprio'));

-- 2. Quem fez o cadastro (contato comercial) e o limite por sessão do navegador
create table if not exists public.cadastros_proprios (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null unique references public.cartorios(id) on delete cascade,
  client_request_id uuid not null unique,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  nome text not null check (char_length(nome) between 2 and 100),
  cargo text not null check (char_length(cargo) between 2 and 100),
  whatsapp text not null check (char_length(whatsapp) between 8 and 30),
  email text not null check (char_length(email) between 3 and 255),
  origem text check (origem is null or (char_length(origem) between 1 and 80 and origem ~ '^[a-z0-9._-]+$')),
  cta text check (cta is null or (char_length(cta) between 1 and 40 and cta ~ '^[a-z0-9-]+$')),
  created_at timestamptz not null default now()
);
create index if not exists cadastros_proprios_source_idx on public.cadastros_proprios (source_hash, created_at desc);
create index if not exists cadastros_proprios_created_idx on public.cadastros_proprios (created_at desc);
alter table public.cadastros_proprios enable row level security;
revoke all on table public.cadastros_proprios from public, anon, authenticated;
grant all on table public.cadastros_proprios to service_role;

-- 3. CNPJ com dígitos verificadores válidos
create or replace function cartoquali_private.valid_cnpj(_cnpj text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  _d text := regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g');
  _weights1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  _weights2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  _sum int := 0;
  _check int;
begin
  if length(_d) <> 14 or _d ~ '^(\d)\1{13}$' then return false; end if;
  for i in 1..12 loop _sum := _sum + substr(_d, i, 1)::int * _weights1[i]; end loop;
  _check := case when _sum % 11 < 2 then 0 else 11 - _sum % 11 end;
  if _check <> substr(_d, 13, 1)::int then return false; end if;
  _sum := 0;
  for i in 1..13 loop _sum := _sum + substr(_d, i, 1)::int * _weights2[i]; end loop;
  _check := case when _sum % 11 < 2 then 0 else 11 - _sum % 11 end;
  return _check = substr(_d, 14, 1)::int;
end $$;
revoke all on function cartoquali_private.valid_cnpj(text) from public, anon, authenticated;
grant execute on function cartoquali_private.valid_cnpj(text) to service_role;

-- 4. Conferência antes de criar o acesso no Auth (o convite sai por e-mail logo depois).
-- Devolve o cartório já criado quando o mesmo pedido chega de novo (idempotência).
create or replace function public.check_self_signup(
  _client_request_id uuid, _cnpj text, _email text, _source_hash text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare _existing uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  select cartorio_id into _existing from public.cadastros_proprios where client_request_id = _client_request_id;
  if _existing is not null then return jsonb_build_object('duplicate', true, 'id', _existing); end if;
  if not cartoquali_private.valid_cnpj(_cnpj) then raise exception 'invalid_cnpj' using errcode = '22023'; end if;
  if (select count(*) from public.cadastros_proprios
      where source_hash = _source_hash and created_at >= now() - interval '1 hour') >= 2 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  -- Trava geral contra cadastro em massa; acima disso a conversa segue pelo WhatsApp.
  if (select count(*) from public.cadastros_proprios where created_at >= now() - interval '1 day') >= 30 then
    raise exception 'daily_limit' using errcode = '54000';
  end if;
  if exists (select 1 from public.cartorios
             where regexp_replace(cnpj, '[^0-9]', '', 'g') = regexp_replace(_cnpj, '[^0-9]', '', 'g')) then
    raise exception 'duplicate_registry' using errcode = '23505';
  end if;
  if exists (select 1 from public.usuarios where lower(email) = lower(btrim(_email))) then
    raise exception 'duplicate_user' using errcode = '23505';
  end if;
  return jsonb_build_object('duplicate', false);
end $$;
revoke all on function public.check_self_signup(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.check_self_signup(uuid, text, text, text) to service_role;

-- 5. Cadastro completo, numa transação só
create or replace function public.create_self_signup_registry(
  _client_request_id uuid,
  _auth_user_id uuid,
  _source_hash text,
  _nome text,
  _cargo text,
  _cartorio text,
  _cnpj text,
  _cidade text,
  _estado text,
  _atribuicoes text[],
  _whatsapp text,
  _email text,
  _origem text default null,
  _cta text default null)
returns jsonb language plpgsql security definer set search_path = 'public', 'extensions', 'cartoquali_private', 'pg_temp' as $$
declare
  _check jsonb;
  _clean text[];
  _tipo text;
  _cartorio_id uuid;
  _onboarding_id uuid;
  _user_id uuid;
  _survey_id uuid;
  _point_id uuid;
  _code text;
  _attempt int := 0;
  _labels constant jsonb := jsonb_build_object(
    'notas', 'Tabelionato de Notas', 'protesto', 'Tabelionato de Protesto',
    'imoveis', 'Registro de Imóveis', 'rtd_pj', 'Registro de Títulos e Documentos e Civil de Pessoas Jurídicas',
    'civil_pn', 'Registro Civil das Pessoas Naturais', 'maritimo', 'Registro de Contratos Marítimos',
    'distribuicao', 'Registro de Distribuição');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  -- Serializa os cadastros para que as travas de CNPJ, e-mail e limites valham também em pedidos simultâneos.
  perform pg_advisory_xact_lock(hashtext('cartoquali.self_signup'));

  _check := public.check_self_signup(_client_request_id, _cnpj, _email, _source_hash);
  if (_check->>'duplicate')::boolean then return _check; end if;

  if _auth_user_id is null
     or char_length(btrim(coalesce(_nome, ''))) not between 2 and 100
     or char_length(btrim(coalesce(_cargo, ''))) not between 2 and 100
     or char_length(btrim(coalesce(_cartorio, ''))) not between 3 and 160
     or char_length(btrim(coalesce(_cidade, ''))) not between 2 and 120
     or upper(btrim(coalesce(_estado, ''))) !~ '^[A-Z]{2}$'
     or btrim(coalesce(_whatsapp, '')) !~ '^[+()\-\s\d]{8,30}$'
     or btrim(coalesce(_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'invalid_signup' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into _clean from unnest(coalesce(_atribuicoes, '{}')) a;
  if cardinality(_clean) = 0
     or not (_clean <@ array['notas','protesto','imoveis','rtd_pj','civil_pn','maritimo','distribuicao']::text[]) then
    raise exception 'invalid_attribution' using errcode = '22023';
  end if;
  if exists (select 1 from public.usuarios where auth_user_id = _auth_user_id) then
    raise exception 'duplicate_user' using errcode = '23505';
  end if;
  select left(string_agg(_labels->>a, ', ' order by a), 120) into _tipo from unnest(_clean) a;

  insert into public.cartorios(razao_social, nome_fantasia, cnpj, tipo, telefone, email, cidade, estado,
                               responsavel, status, plano, environment_kind, atribuicoes)
  values (btrim(_cartorio), btrim(_cartorio), regexp_replace(_cnpj, '[^0-9]', '', 'g'), _tipo,
          btrim(_whatsapp), lower(btrim(_email)), btrim(_cidade), upper(btrim(_estado)), btrim(_nome),
          'ativo', 'Teste grátis', 'real', _clean)
  returning id into _cartorio_id;
  insert into public.configuracoes_cartorio(cartorio_id, nome_exibicao) values (_cartorio_id, btrim(_cartorio));

  insert into public.usuarios(cartorio_id, auth_user_id, nome, email, telefone, status)
  values (_cartorio_id, _auth_user_id, btrim(_nome), lower(btrim(_email)), btrim(_whatsapp), 'ativo')
  returning id into _user_id;
  insert into public.user_roles(user_id, role) values (_user_id, 'CARTORIO_ADMIN');

  -- O gatilho seed_survey_questions cria as perguntas essenciais e as extras do modelo.
  insert into public.pesquisas(cartorio_id, nome, descricao, status, versao, configuracoes)
  values (_cartorio_id, 'Pesquisa de satisfação', 'Pesquisa padrão do CartoQuali.', 'rascunho', '1.0', '{}')
  returning id into _survey_id;
  update public.pesquisas set status = 'ativa', updated_at = now() where id = _survey_id;

  loop
    _attempt := _attempt + 1;
    _code := 'CQ-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    exit when not exists (select 1 from public.pontos_avaliacao p
                          where lower(p.codigo) = lower(_code) or p.public_slug = lower(_code));
    if _attempt > 5 then raise exception 'code_generation_failed'; end if;
  end loop;
  insert into public.pontos_avaliacao(cartorio_id, pesquisa_id, nome, localizacao, codigo, descricao, status, public_slug, metodo)
  values (_cartorio_id, _survey_id, 'Atendimento', 'Balcão de atendimento', _code, null, 'ativo', lower(_code), 'link_qr_nfc')
  returning id into _point_id;

  insert into public.cartorio_onboarding(cartorio_id, client_request_id, created_by_id, origem, status,
                                         current_step, survey_id, point_id, activated_at)
  values (_cartorio_id, _client_request_id, null, 'cadastro_proprio', 'ACTIVE', 7, _survey_id, _point_id, now())
  returning id into _onboarding_id;

  -- Teste de 7 dias: começa no primeiro login (start_registry_trial).
  insert into public.periodo_teste_cartorio(cartorio_id, aplicavel, iniciado_em)
  values (_cartorio_id, true, null)
  on conflict (cartorio_id) do update set aplicavel = true;

  insert into public.cadastros_proprios(cartorio_id, client_request_id, source_hash, nome, cargo, whatsapp, email, origem, cta)
  values (_cartorio_id, _client_request_id, _source_hash, btrim(_nome), btrim(_cargo), btrim(_whatsapp),
          lower(btrim(_email)), _origem, _cta);

  perform cartoquali_private.onboarding_audit(_cartorio_id, null, 'CARTORIO_SELF_SIGNUP', 'registry', _cartorio_id,
    jsonb_build_object('source', 'self_signup', 'attributions', _clean));
  perform cartoquali_private.onboarding_audit(_cartorio_id, null, 'CARTORIO_ACTIVATED', 'onboarding', _onboarding_id,
    jsonb_build_object('source', 'self_signup'));

  return jsonb_build_object('duplicate', false, 'id', _cartorio_id, 'pointCode', _code);
end $$;
revoke all on function public.create_self_signup_registry(uuid, uuid, text, text, text, text, text, text, text, text[], text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_self_signup_registry(uuid, uuid, text, text, text, text, text, text, text, text[], text, text, text, text)
  to service_role;

-- 6. Painel da plataforma: origem do cadastro, contato de quem se cadastrou e situação do teste
create or replace function public.get_platform_overview()
returns jsonb language plpgsql stable security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _rows jsonb;
  _hidden int;
begin
  if not cartoquali_private.has_any_role(array['PLATFORM_ADMIN']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into _hidden from public.cartorios where oculto;

  select coalesce(jsonb_agg(row_data order by row_data->>'name'), '[]'::jsonb) into _rows
  from (
    select jsonb_build_object(
      'id', c.id,
      'name', c.nome_fantasia,
      'city', c.cidade,
      'state', c.estado,
      'status', c.status,
      'environmentKind', c.environment_kind,
      'onboardingStatus', o.status,
      'origin', coalesce(o.origem, 'plataforma'),
      'selfSignup', case when sp.id is null then null else jsonb_build_object(
        'createdAt', sp.created_at,
        'name', sp.nome,
        'role', sp.cargo,
        'whatsapp', sp.whatsapp,
        'email', sp.email) end,
      'trial', case when pt.aplicavel then jsonb_build_object(
        'startedAt', pt.iniciado_em,
        'endsAt', pt.iniciado_em + interval '7 days',
        'expired', cartoquali_private.registry_trial_expired(c.id)) end,
      'evaluations7d', coalesce(ev.last7, 0),
      'evaluations30d', coalesce(ev.last30, 0),
      'average30d', ev.avg30,
      'lastEvaluationAt', ev.last_at,
      'openOccurrences', coalesce(oc.open_count, 0),
      'activeUsers', coalesce(us.active_count, 0),
      'lastAccessAt', us.last_access,
      'billing', case when cb.cartorio_id is null then null else jsonb_build_object(
        'monthlyFee', cb.valor_mensal,
        'dueDay', cb.dia_vencimento,
        'startMonth', to_char(cb.inicio, 'YYYY-MM'),
        'active', cb.ativo) end,
      'payments', coalesce(pg.items, '[]'::jsonb)
    ) as row_data
    from public.cartorios c
    left join public.cartorio_onboarding o on o.cartorio_id = c.id
    left join public.cobranca_cartorio cb on cb.cartorio_id = c.id
    left join public.periodo_teste_cartorio pt on pt.cartorio_id = c.id
    left join public.cadastros_proprios sp on sp.cartorio_id = c.id
    left join lateral (
      select count(*) filter (where a.created_at >= now() - interval '7 days') as last7,
             count(*) filter (where a.created_at >= now() - interval '30 days') as last30,
             round(avg(a.nota_geral) filter (where a.created_at >= now() - interval '30 days'), 2) as avg30,
             max(a.created_at) as last_at
      from public.avaliacoes a
      where a.cartorio_id = c.id and not a.is_test
    ) ev on true
    left join lateral (
      select count(*) as open_count
      from public.ocorrencias_qualidade q
      where q.cartorio_id = c.id and q.status not in ('resolvida', 'encerrada')
    ) oc on true
    left join lateral (
      select count(*) filter (where u.status = 'ativo') as active_count,
             max(au.last_sign_in_at) as last_access
      from public.usuarios u
      left join auth.users au on au.id = u.auth_user_id
      where u.cartorio_id = c.id
    ) us on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'month', to_char(p.competencia, 'YYYY-MM'),
               'amount', p.valor,
               'paidOn', p.pago_em,
               'method', p.forma,
               'note', p.observacao) order by p.competencia desc) as items
      from public.pagamentos_cartorio p
      where p.cartorio_id = c.id
    ) pg on true
    where not c.oculto
  ) t;

  return jsonb_build_object('registries', _rows, 'hiddenCount', _hidden);
end $$;
