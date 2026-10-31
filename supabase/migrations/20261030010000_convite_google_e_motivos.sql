-- Convite para publicar também no Google + motivos de melhoria em códigos fixos.
-- 1) O cartório guarda o perfil do Google (place_id) nas Configurações e liga o convite.
--    O fluxo público só recebe o place_id quando o convite está ligado, pela RPC de contexto.
-- 2) As opções da pergunta "O que poderia melhorar?" viram códigos fixos em avaliacoes.motivos
--    (só notas de 1 a 3), para indicadores e ocorrências. O texto original continua igual.
-- 3) Perguntas de texto (comentário) nunca são obrigatórias no envio.
-- 4) O clique em "Publicar no Google" é registrado uma única vez por avaliação, até 30 minutos
--    depois do envio, sem IP, navegador ou qualquer dado pessoal novo. Nada é publicado no Google.
-- Regra do Google (review gating): o convite é o mesmo para qualquer nota; nada aqui depende dela.

-- Configuração do Google por cartório (RLS atual: só Administrador do cartório e da plataforma).
alter table public.configuracoes_cartorio
  add column if not exists google_place_id text,
  add column if not exists google_place_nome text,
  add column if not exists google_convite_ativo boolean not null default false;
alter table public.configuracoes_cartorio
  add constraint configuracoes_google_place_id_formato
    check (google_place_id is null or google_place_id ~ '^[A-Za-z0-9_-]{10,300}$'),
  add constraint configuracoes_google_place_nome_tamanho
    check (google_place_nome is null or length(google_place_nome) <= 300),
  add constraint configuracoes_google_convite_exige_perfil
    check (not google_convite_ativo or google_place_id is not null);

-- Motivos e clique na avaliação. A equipe só lê (sem UPDATE para authenticated).
alter table public.avaliacoes
  add column if not exists motivos text[],
  add column if not exists google_clicado_em timestamptz;
alter table public.avaliacoes
  add constraint avaliacoes_motivos_permitidos
    check (motivos is null or (cardinality(motivos) between 1 and 6
      and motivos <@ array['demora','atendimento','informacao','ambiente','resolucao','outro']::text[]));

-- Opção escrita pelo cartório → código fixo. Mesmos padrões da migração 20261010010000.
create or replace function cartoquali_private.motivo_codigo(_label text)
returns text language sql immutable set search_path = '' as $$
  select case
    when _label is null or btrim(_label) = '' or _label ~* '^nada a melhorar' then null
    when _label ~* '^outro\M' then 'outro'
    when _label ~* '(tempo|espera|demora|fila|prazo)' then 'demora'
    when _label ~* '(cordial|educa|respeito|simpatia)' then 'atendimento'
    when _label ~* '(clareza|informa|orienta)' then 'informacao'
    when _label ~* '(instala|estrutura|limpeza|conforto|acessib|ambiente|sinaliza)' then 'ambiente'
    when _label ~* '(resolu|resolv)' then 'resolucao'
    else 'outro'
  end
$$;
revoke all on function cartoquali_private.motivo_codigo(text) from public, anon, authenticated;

-- As duas RPCs de envio gravam a resposta de melhoria em respostas.valor (lista de opções);
-- este gatilho traduz a lista em códigos na mesma transação, sem mexer nas RPCs.
create or replace function cartoquali_private.set_evaluation_reasons()
returns trigger language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _order constant text[] := array['demora','atendimento','informacao','ambiente','resolucao','outro'];
begin
  if jsonb_typeof(new.valor) is distinct from 'array' or not exists (
    select 1 from public.perguntas q where q.id = new.pergunta_id and q.tipo = 'multiple_choice' and q.dimensao = 'comment'
  ) then
    return null;
  end if;
  update public.avaliacoes a
  set motivos = (
    select array_agg(c order by array_position(_order, c))
    from (
      select distinct c from unnest(coalesce(a.motivos, '{}'::text[])) c
      union
      select cartoquali_private.motivo_codigo(v) from jsonb_array_elements_text(new.valor) v
    ) s
    where c is not null
  )
  where a.id = new.avaliacao_id and a.nota_geral <= 3;
  return null;
end $$;
revoke all on function cartoquali_private.set_evaluation_reasons() from public, anon, authenticated;
drop trigger if exists set_evaluation_reasons on public.respostas;
create trigger set_evaluation_reasons after insert on public.respostas
  for each row execute function cartoquali_private.set_evaluation_reasons();

-- Trocas exatas sobre a definição atual das funções (falha se o trecho não existir).
create or replace function cartoquali_private.patch_function(_signature text, _pairs text[])
returns void language plpgsql set search_path = pg_catalog, public as $$
declare
  _ddl text := pg_get_functiondef(_signature::regprocedure);
  _i int;
begin
  for _i in 1 .. array_length(_pairs, 1) / 2 loop
    if position(_pairs[_i * 2 - 1] in _ddl) = 0 then
      raise exception 'patch_anchor_not_found: % (#%)', _signature, _i;
    end if;
    _ddl := replace(_ddl, _pairs[_i * 2 - 1], _pairs[_i * 2]);
  end loop;
  execute _ddl;
end $$;

-- Contexto público: o place_id só sai quando o convite está ligado.
select cartoquali_private.patch_function(
  'public.get_public_evaluation_context(text)',
  array[
    $a$'privacyContactChannel',_settings.privacy_contact_channel)$a$,
    $b$'privacyContactChannel',_settings.privacy_contact_channel,'googlePlaceId',case when _settings.google_convite_ativo then _settings.google_place_id end)$b$
  ]
);
select cartoquali_private.patch_function(
  'public.get_onboarding_test_context(text,uuid)',
  array[
    $a$'privacyContactChannel',_settings.privacy_contact_channel)$a$,
    $b$'privacyContactChannel',_settings.privacy_contact_channel,'googlePlaceId',case when _settings.google_convite_ativo then _settings.google_place_id end)$b$
  ]
);

-- Envio público: comentário (texto) nunca obrigatório; devolve o id para o registro do clique.
select cartoquali_private.patch_function(
  'public.submit_public_evaluation(text,uuid,text,jsonb,jsonb,uuid,boolean)',
  array[
    $a$if _visible and _question.obrigatoria and ($a$,
    $b$if _visible and _question.obrigatoria and _question.tipo<>'text' and ($b$,
    $c$return jsonb_build_object('ok',true,'duplicate',false);$c$,
    $d$return jsonb_build_object('ok',true,'duplicate',false,'evaluationId',_evaluation_id);$d$
  ]
);
select cartoquali_private.patch_function(
  'public.submit_onboarding_test_evaluation(text,uuid,uuid,text,jsonb)',
  array[
    $a$IF _visible AND _q.obrigatoria AND ($a$,
    $b$IF _visible AND _q.obrigatoria AND _q.tipo<>'text' AND ($b$
  ]
);

-- Painel: cliques no Google e motivos das notas 1 a 3, no mesmo recorte de período e filtros.
select cartoquali_private.patch_function(
  'public.get_dashboard_indicators(timestamptz,timestamptz,timestamptz,timestamptz,uuid,uuid,text,uuid)',
  array[
    $a$'filters',to_jsonb(f)) INTO _result$a$,
    $b$'googleClicks',(SELECT count(*) FILTER (WHERE ce.google_clicado_em IS NOT NULL)::int FROM current_evaluations ce),'reasons',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',r.code,'count',r.count) ORDER BY r.count DESC,r.code),'[]') FROM (SELECT m AS code,count(*)::int AS count FROM current_evaluations ce CROSS JOIN LATERAL unnest(ce.motivos) m WHERE ce.nota_geral<=3 GROUP BY m) r),'filters',to_jsonb(f)) INTO _result$b$
  ]
);

drop function cartoquali_private.patch_function(text, text[]);

-- Clique em "Publicar no Google". Chamado só pelo servidor (service_role), depois de conferir o
-- token assinado devolvido no envio. Uma vez por avaliação real, até 30 minutos após o envio.
create or replace function public.registrar_clique_google(_avaliacao_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare _rows int;
begin
  if _avaliacao_id is null then raise exception 'invalid_request' using errcode = '22023'; end if;
  update public.avaliacoes a
  set google_clicado_em = now()
  where a.id = _avaliacao_id
    and not a.is_test
    and a.google_clicado_em is null
    and a.created_at > now() - interval '30 minutes'
    and exists (
      select 1 from public.configuracoes_cartorio s
      where s.cartorio_id = a.cartorio_id and s.google_convite_ativo and s.google_place_id is not null
    );
  get diagnostics _rows = row_count;
  return _rows = 1;
end $$;
revoke all on function public.registrar_clique_google(uuid) from public, anon, authenticated;
grant execute on function public.registrar_clique_google(uuid) to service_role;

-- Busca do perfil no Google pelo painel: só Administrador do cartório (mesmo papel das
-- Configurações) e no máximo 20 buscas a cada 10 minutos por usuário, para conter o custo.
create table if not exists cartoquali_private.google_places_buscas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists google_places_buscas_usuario_idx
  on cartoquali_private.google_places_buscas (usuario_id, created_at);
revoke all on cartoquali_private.google_places_buscas from public, anon, authenticated;

create or replace function public.registrar_busca_google_places()
returns boolean language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare _user uuid := cartoquali_private.current_user_id();
begin
  if auth.uid() is null or _user is null or cartoquali_private.current_cartorio_id() is null
     or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if (select count(*) from cartoquali_private.google_places_buscas
      where usuario_id = _user and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into cartoquali_private.google_places_buscas(usuario_id) values (_user);
  delete from cartoquali_private.google_places_buscas where created_at < now() - interval '1 day';
  return true;
end $$;
revoke all on function public.registrar_busca_google_places() from public, anon;
grant execute on function public.registrar_busca_google_places() to authenticated, service_role;
