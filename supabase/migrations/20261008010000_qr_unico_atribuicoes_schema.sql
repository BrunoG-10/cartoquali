-- QR Code único: atribuições da serventia, catálogo de serviços e perguntas essenciais.
-- Spec: docs/superpowers/specs/2026-10-07-qr-unico-atribuicoes-design.md (§5–§7).
-- Aditiva: nenhuma tabela/coluna removida, nenhuma avaliação alterada.

-- 1. Atribuições (Lei 8.935/1994, art. 5º)
alter table public.cartorios add column if not exists atribuicoes text[] not null default '{}';
alter table public.cartorios drop constraint if exists cartorios_atribuicoes_validas;
alter table public.cartorios add constraint cartorios_atribuicoes_validas
  check (atribuicoes <@ array['notas','protesto','imoveis','rtd_pj','civil_pn','maritimo','distribuicao']::text[]);

-- 2. Catálogo global de serviços (mesmos valores de src/lib/attributions.ts)
create table if not exists public.catalogo_servicos (
  chave text primary key,
  atribuicao text not null check (atribuicao in ('notas','protesto','imoveis','rtd_pj','civil_pn','maritimo','distribuicao')),
  nome text not null,
  ordem integer not null check (ordem > 0)
);
insert into public.catalogo_servicos(chave, atribuicao, nome, ordem) values
  ('notas.reconhecimento_firma','notas','Reconhecimento de firma',1),
  ('notas.autenticacao','notas','Autenticação de cópias',2),
  ('notas.escritura','notas','Escritura',3),
  ('notas.procuracao','notas','Procuração',4),
  ('notas.testamento','notas','Testamento',5),
  ('notas.ata_notarial','notas','Ata notarial',6),
  ('notas.inventario_divorcio','notas','Inventário ou divórcio em cartório',7),
  ('protesto.protesto_titulo','protesto','Protesto de título',1),
  ('protesto.cancelamento','protesto','Cancelamento de protesto',2),
  ('protesto.certidao','protesto','Certidão de protesto',3),
  ('imoveis.registro_averbacao','imoveis','Registro ou averbação',1),
  ('imoveis.certidao_matricula','imoveis','Certidão de matrícula',2),
  ('imoveis.usucapiao','imoveis','Usucapião extrajudicial',3),
  ('rtd_pj.registro_documentos','rtd_pj','Registro de documentos',1),
  ('rtd_pj.registro_pj','rtd_pj','Registro de pessoa jurídica',2),
  ('rtd_pj.notificacao','rtd_pj','Notificação',3),
  ('civil_pn.nascimento','civil_pn','Nascimento',1),
  ('civil_pn.casamento','civil_pn','Casamento',2),
  ('civil_pn.obito','civil_pn','Óbito',3),
  ('civil_pn.certidoes','civil_pn','Certidões',4),
  ('civil_pn.habilitacao_casamento','civil_pn','Habilitação de casamento',5),
  ('maritimo.contrato','maritimo','Registro de contrato marítimo',1),
  ('distribuicao.distribuicao','distribuicao','Distribuição',1),
  ('distribuicao.certidao','distribuicao','Certidão de distribuição',2)
on conflict (chave) do update set atribuicao = excluded.atribuicao, nome = excluded.nome, ordem = excluded.ordem;
alter table public.catalogo_servicos enable row level security;
drop policy if exists catalogo_servicos_read on public.catalogo_servicos;
create policy catalogo_servicos_read on public.catalogo_servicos for select to authenticated using (true);
revoke all on public.catalogo_servicos from anon, authenticated;
grant select on public.catalogo_servicos to authenticated;
grant all on public.catalogo_servicos to service_role;

-- 3. Serviços de cada cartório
create table if not exists public.servicos_cartorio (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  catalogo_chave text not null references public.catalogo_servicos(chave) on delete restrict,
  atribuicao text not null,
  nome text not null,
  ativo boolean not null default true,
  ordem integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cartorio_id, catalogo_chave),
  unique (id, cartorio_id)
);
alter table public.servicos_cartorio enable row level security;
drop policy if exists servicos_cartorio_select_own_tenant on public.servicos_cartorio;
create policy servicos_cartorio_select_own_tenant on public.servicos_cartorio for select to authenticated
  using (cartorio_id = (select cartoquali_private.current_cartorio_id()));
revoke all on public.servicos_cartorio from anon, authenticated;
grant select on public.servicos_cartorio to authenticated;
grant all on public.servicos_cartorio to service_role;

-- Mantém os serviços em dia com as atribuições (desmarcar não apaga: o histórico continua).
create or replace function cartoquali_private.sync_registry_services()
returns trigger language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
begin
  insert into public.servicos_cartorio(cartorio_id, catalogo_chave, atribuicao, nome, ordem)
  select new.id, c.chave, c.atribuicao, c.nome, c.ordem
  from public.catalogo_servicos c
  where c.atribuicao = any(new.atribuicoes)
  on conflict (cartorio_id, catalogo_chave) do nothing;
  return new;
end $$;
revoke all on function cartoquali_private.sync_registry_services() from public, anon, authenticated;
drop trigger if exists sync_registry_services on public.cartorios;
create trigger sync_registry_services after insert or update of atribuicoes on public.cartorios
  for each row execute function cartoquali_private.sync_registry_services();

-- 4. Serviço informado na avaliação (opcional)
alter table public.avaliacoes add column if not exists servico_id uuid;
alter table public.avaliacoes add column if not exists servico_outro boolean not null default false;
alter table public.avaliacoes drop constraint if exists avaliacoes_servico_mesmo_cartorio;
alter table public.avaliacoes add constraint avaliacoes_servico_mesmo_cartorio
  foreign key (servico_id, cartorio_id) references public.servicos_cartorio(id, cartorio_id) on delete restrict;
create index if not exists avaliacoes_servico_idx on public.avaliacoes(cartorio_id, servico_id, created_at) where not is_test;

-- 5. Perguntas essenciais
alter table public.perguntas add column if not exists chave_essencial text;
alter table public.perguntas drop constraint if exists perguntas_chave_essencial_valida;
alter table public.perguntas add constraint perguntas_chave_essencial_valida
  check (chave_essencial in ('overall','courtesy','clarity','time','structure','resolution'));
create unique index if not exists perguntas_essencial_unica on public.perguntas(pesquisa_id, chave_essencial) where chave_essencial is not null;

-- Clientes autenticados não criam, removem nem alteram a estrutura de uma essencial; só o texto.
-- Migrações (sem JWT) e a semeadura (configuração local da transação) passam.
create or replace function cartoquali_private.protect_essential_question()
returns trigger language plpgsql set search_path = public, cartoquali_private, pg_temp as $$
declare
  _client boolean := coalesce(auth.role(), '') in ('authenticated', 'anon')
    and coalesce(current_setting('cartoquali.seeding_essentials', true), '') <> 'on';
begin
  if tg_op = 'DELETE' then
    if old.chave_essencial is not null and _client then raise exception 'essential_question_locked' using errcode = '42501'; end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.chave_essencial is not null and _client then raise exception 'essential_question_locked' using errcode = '42501'; end if;
    return new;
  end if;
  if new.chave_essencial is distinct from old.chave_essencial and _client then
    raise exception 'essential_question_locked' using errcode = '42501';
  end if;
  if old.chave_essencial is not null and _client and (
    new.tipo is distinct from old.tipo or new.dimensao is distinct from old.dimensao
    or new.obrigatoria is distinct from old.obrigatoria or new.ativa is distinct from old.ativa
    or new.pesquisa_id is distinct from old.pesquisa_id
  ) then
    raise exception 'essential_question_locked' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function cartoquali_private.protect_essential_question() from public, anon, authenticated;
drop trigger if exists protect_essential_question on public.perguntas;
create trigger protect_essential_question before insert or update or delete on public.perguntas
  for each row execute function cartoquali_private.protect_essential_question();

-- Opções da pergunta de resolução e das melhorias (usadas na semeadura e na migração).
create or replace function cartoquali_private.insert_essential_question(_pesquisa_id uuid, _chave text, _ordem integer)
returns uuid language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare _id uuid;
begin
  perform set_config('cartoquali.seeding_essentials', 'on', true);
  insert into public.perguntas(pesquisa_id, texto, tipo, ordem, obrigatoria, ativa, dimensao, chave_essencial)
  select _pesquisa_id, d.texto, d.tipo, _ordem, d.obrigatoria, true, d.dimensao, _chave
  from (values
    ('overall','Como você avalia sua experiência geral hoje?','stars',true,'overall'),
    ('courtesy','Como você avalia a cordialidade e o respeito no atendimento?','scale',true,'service'),
    ('clarity','As informações foram claras e fáceis de entender?','scale',true,'clarity'),
    ('time','Como você avalia o tempo de espera e o cumprimento dos prazos informados?','scale',true,'time'),
    ('structure','Como você avalia as instalações (conforto, limpeza, sinalização e acessibilidade)?','scale',false,'structure'),
    ('resolution','Seu atendimento foi resolvido?','yes_no',true,'resolution')
  ) as d(chave, texto, tipo, obrigatoria, dimensao)
  where d.chave = _chave
  returning id into _id;
  if _chave = 'resolution' then
    insert into public.opcoes_resposta(pergunta_id, texto, valor, ordem)
    values (_id,'Sim','sim',1), (_id,'Parcialmente','parcialmente',2), (_id,'Não','nao',3);
  end if;
  perform set_config('cartoquali.seeding_essentials', 'off', true);
  return _id;
end $$;
revoke all on function cartoquali_private.insert_essential_question(uuid, text, integer) from public, anon, authenticated;

-- Toda pesquisa nova nasce com as 6 essenciais e as 2 extras do modelo.
create or replace function cartoquali_private.seed_survey_questions()
returns trigger language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare _overall uuid; _melhoria uuid;
begin
  _overall := cartoquali_private.insert_essential_question(new.id, 'overall', 1);
  perform cartoquali_private.insert_essential_question(new.id, 'courtesy', 2);
  perform cartoquali_private.insert_essential_question(new.id, 'clarity', 3);
  perform cartoquali_private.insert_essential_question(new.id, 'time', 4);
  perform cartoquali_private.insert_essential_question(new.id, 'structure', 5);
  perform cartoquali_private.insert_essential_question(new.id, 'resolution', 6);
  insert into public.perguntas(pesquisa_id, texto, tipo, ordem, obrigatoria, ativa, dimensao, condicao)
  values (new.id, 'O que poderia melhorar?', 'multiple_choice', 7, false, true, 'comment',
          jsonb_build_object('sourceQuestionId', _overall::text, 'operator', 'lte', 'value', 3))
  returning id into _melhoria;
  insert into public.opcoes_resposta(pergunta_id, texto, valor, ordem) values
    (_melhoria,'Tempo de espera','Tempo de espera',1),
    (_melhoria,'Cordialidade no atendimento','Cordialidade no atendimento',2),
    (_melhoria,'Clareza das informações','Clareza das informações',3),
    (_melhoria,'Instalações','Instalações',4),
    (_melhoria,'Resolução do meu pedido','Resolução do meu pedido',5),
    (_melhoria,'Outro','Outro',6);
  insert into public.perguntas(pesquisa_id, texto, tipo, ordem, obrigatoria, ativa, dimensao)
  values (new.id, 'Deixe um comentário (opcional).', 'text', 8, false, true, 'comment');
  return new;
end $$;
revoke all on function cartoquali_private.seed_survey_questions() from public, anon, authenticated;
drop trigger if exists seed_survey_questions on public.pesquisas;
create trigger seed_survey_questions after insert on public.pesquisas
  for each row execute function cartoquali_private.seed_survey_questions();

-- O onboarding deixa de inserir as perguntas do modelo (o trigger acima cria).
create or replace function cartoquali_private.save_onboarding_survey(_cartorio_id uuid, _name text, _description text, _use_template boolean default true)
returns jsonb language plpgsql security definer set search_path = 'public','cartoquali_private','pg_temp' as $$
declare _caller uuid; _survey_id uuid;
begin
  if auth.uid() is null or not cartoquali_private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into _caller from public.usuarios where auth_user_id = auth.uid() and status = 'ativo';
  select survey_id into _survey_id from public.cartorio_onboarding where cartorio_id = _cartorio_id;
  if _survey_id is null then
    insert into public.pesquisas(cartorio_id, nome, descricao, status, versao, configuracoes)
    values (_cartorio_id, btrim(_name), nullif(btrim(_description), ''), 'rascunho', '1.0', '{}') returning id into _survey_id;
    update public.cartorio_onboarding set survey_id = _survey_id, current_step = greatest(current_step, 3) where cartorio_id = _cartorio_id;
  else
    update public.pesquisas set nome = btrim(_name), descricao = nullif(btrim(_description), ''), updated_at = now()
    where id = _survey_id and cartorio_id = _cartorio_id;
  end if;
  insert into public.audit_logs(cartorio_id, user_id, action, entity, entity_id, metadata)
  values (_cartorio_id, _caller, 'ONBOARDING_SURVEY_SAVED', 'survey', _survey_id, '{}');
  return jsonb_build_object('id', _survey_id);
end $$;

-- 6. Migração das pesquisas existentes: marca a 1ª pergunta ativa compatível de cada dimensão,
-- cria as essenciais que faltarem e renumera (essenciais 1–6, extras depois, na ordem atual).
do $$
declare
  _survey record;
  _map record;
  _found uuid;
begin
  for _survey in select id from public.pesquisas loop
    for _map in select * from (values
      ('overall','overall',array['stars','scale'],true,1),
      ('courtesy','service',array['stars','scale'],true,2),
      ('clarity','clarity',array['stars','scale'],true,3),
      ('time','time',array['stars','scale'],true,4),
      ('structure','structure',array['stars','scale'],false,5),
      ('resolution','resolution',array['yes_no'],true,6)
    ) as m(chave, dimensao, tipos, obrigatoria, ordem) loop
      if exists (select 1 from public.perguntas where pesquisa_id = _survey.id and chave_essencial = _map.chave) then continue; end if;
      select id into _found from public.perguntas
      where pesquisa_id = _survey.id and ativa and chave_essencial is null and dimensao = _map.dimensao and tipo = any(_map.tipos)
      order by ordem limit 1;
      if _found is not null then
        update public.perguntas set chave_essencial = _map.chave, obrigatoria = _map.obrigatoria where id = _found;
      else
        update public.perguntas set ordem = ordem + 20000 where pesquisa_id = _survey.id;
        perform cartoquali_private.insert_essential_question(_survey.id, _map.chave, 19000 + _map.ordem);
      end if;
      _found := null;
    end loop;
    update public.perguntas set ordem = ordem + 40000 where pesquisa_id = _survey.id;
    update public.perguntas p set ordem = r.nova_ordem
    from (
      select id, row_number() over (
        order by case chave_essencial when 'overall' then 1 when 'courtesy' then 2 when 'clarity' then 3
          when 'time' then 4 when 'structure' then 5 when 'resolution' then 6 else 7 end, ordem
      ) as nova_ordem
      from public.perguntas where pesquisa_id = _survey.id
    ) r
    where p.id = r.id;
  end loop;
end $$;

-- 7. RPCs de configuração
create or replace function public.set_registry_attributions(_atribuicoes text[])
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare _cartorio uuid := cartoquali_private.current_cartorio_id(); _clean text[];
begin
  if _cartorio is null or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into _clean from unnest(coalesce(_atribuicoes, '{}')) a;
  if cardinality(_clean) = 0 then raise exception 'attributions_required' using errcode = '22023'; end if;
  if not (_clean <@ array['notas','protesto','imoveis','rtd_pj','civil_pn','maritimo','distribuicao']::text[]) then
    raise exception 'invalid_attribution' using errcode = '22023';
  end if;
  update public.cartorios set atribuicoes = _clean, updated_at = now() where id = _cartorio;
  insert into public.audit_logs(cartorio_id, user_id, action, entity, entity_id, metadata)
  values (_cartorio, cartoquali_private.current_user_id(), 'registry_attributions_updated', 'registry', _cartorio,
          jsonb_build_object('attributions', _clean));
  return jsonb_build_object('attributions', _clean);
end $$;
revoke all on function public.set_registry_attributions(text[]) from public, anon;
grant execute on function public.set_registry_attributions(text[]) to authenticated, service_role;

create or replace function public.set_registry_service_active(_servico_id uuid, _ativo boolean)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare _cartorio uuid := cartoquali_private.current_cartorio_id();
begin
  if _cartorio is null or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.servicos_cartorio set ativo = coalesce(_ativo, true), updated_at = now()
  where id = _servico_id and cartorio_id = _cartorio;
  if not found then raise exception 'service_not_found' using errcode = 'P0002'; end if;
  insert into public.audit_logs(cartorio_id, user_id, action, entity, entity_id, metadata)
  values (_cartorio, cartoquali_private.current_user_id(), 'registry_service_toggled', 'registry_service', _servico_id,
          jsonb_build_object('active', coalesce(_ativo, true)));
  return jsonb_build_object('id', _servico_id, 'active', coalesce(_ativo, true));
end $$;
revoke all on function public.set_registry_service_active(uuid, boolean) from public, anon;
grant execute on function public.set_registry_service_active(uuid, boolean) to authenticated, service_role;

create or replace function public.set_onboarding_attributions(_cartorio_id uuid, _atribuicoes text[])
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare _clean text[];
begin
  if auth.uid() is null or not cartoquali_private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.cartorio_onboarding where cartorio_id = _cartorio_id) then
    raise exception 'onboarding_not_found' using errcode = 'P0002';
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into _clean from unnest(coalesce(_atribuicoes, '{}')) a;
  if cardinality(_clean) = 0 then raise exception 'attributions_required' using errcode = '22023'; end if;
  if not (_clean <@ array['notas','protesto','imoveis','rtd_pj','civil_pn','maritimo','distribuicao']::text[]) then
    raise exception 'invalid_attribution' using errcode = '22023';
  end if;
  update public.cartorios set atribuicoes = _clean, updated_at = now() where id = _cartorio_id;
  return jsonb_build_object('attributions', _clean);
end $$;
revoke all on function public.set_onboarding_attributions(uuid, text[]) from public, anon;
grant execute on function public.set_onboarding_attributions(uuid, text[]) to authenticated, service_role;
