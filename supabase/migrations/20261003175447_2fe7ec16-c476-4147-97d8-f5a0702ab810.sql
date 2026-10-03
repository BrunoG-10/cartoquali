create table public.configuracoes_cartorio (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null unique references public.cartorios(id) on delete restrict,
  nome_exibicao text not null default 'CartoQuali',
  idioma text not null default 'pt-BR',
  formato_data text not null default 'dd/MM/yyyy',
  fuso_horario text not null default 'America/Sao_Paulo',
  mensagem_agradecimento text not null default 'Obrigado pela sua avaliação.',
  pesquisa_padrao_id uuid references public.pesquisas(id) on delete set null,
  permite_avaliacao_anonima boolean not null default true,
  permite_comentarios boolean not null default true,
  permite_contato boolean not null default true,
  metodologia_ativa text not null default 'Metodologia CartoQuali 1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.configuracoes_cartorio to authenticated;
grant all on public.configuracoes_cartorio to service_role;
alter table public.configuracoes_cartorio enable row level security;

create or replace function cartoquali_private.is_current_user(uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select $1 = cartoquali_private.current_user_id()
$$;
revoke all on function cartoquali_private.is_current_user(uuid) from public, anon;
grant execute on function cartoquali_private.is_current_user(uuid) to authenticated, service_role;

create or replace function cartoquali_private.is_last_registry_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.usuarios target
    where target.id=_user_id and target.status='ativo'
      and exists(select 1 from public.user_roles r where r.user_id=target.id and r.role='CARTORIO_ADMIN')
      and 1=(select count(distinct u.id) from public.usuarios u join public.user_roles ur on ur.user_id=u.id where u.cartorio_id=target.cartorio_id and u.status='ativo' and ur.role='CARTORIO_ADMIN')
  )
$$;
revoke all on function cartoquali_private.is_last_registry_admin(uuid) from public, anon, authenticated;
grant execute on function cartoquali_private.is_last_registry_admin(uuid) to service_role;

revoke insert, update, delete on public.usuarios from authenticated;
revoke insert, update, delete on public.user_roles from authenticated;
drop policy if exists usuarios_insert_own_tenant on public.usuarios;
drop policy if exists usuarios_update_own_tenant on public.usuarios;
drop policy if exists usuarios_delete_own_tenant on public.usuarios;
drop policy if exists user_roles_insert_own_tenant on public.user_roles;
drop policy if exists user_roles_update_own_tenant on public.user_roles;
drop policy if exists user_roles_delete_own_tenant on public.user_roles;

alter policy usuarios_select_own_tenant on public.usuarios using (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[]))
);
alter policy user_roles_select_own_tenant on public.user_roles using (
  exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))
  and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[]))
);

alter policy cartorios_update_own_tenant on public.cartorios
using (id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[])))
with check (id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[])));

alter policy pesquisas_insert_own_tenant on public.pesquisas with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])));
alter policy pesquisas_update_own_tenant on public.pesquisas using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[]))) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])));
alter policy pesquisas_delete_own_tenant on public.pesquisas using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])));
alter policy perguntas_insert_own_tenant on public.perguntas with check ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy perguntas_update_own_tenant on public.perguntas using ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()))) with check ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy perguntas_delete_own_tenant on public.perguntas using ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_insert_own_tenant on public.opcoes_resposta with check ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_update_own_tenant on public.opcoes_resposta using ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()))) with check ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_delete_own_tenant on public.opcoes_resposta using ((select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']::text[])) and exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));

create policy configuracoes_select_own_tenant on public.configuracoes_cartorio for select to authenticated using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[])));
create policy configuracoes_insert_own_tenant on public.configuracoes_cartorio for insert to authenticated with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[])));
create policy configuracoes_update_own_tenant on public.configuracoes_cartorio for update to authenticated using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[]))) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[])));

alter policy audit_logs_select_own_tenant on public.audit_logs using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[])));

create or replace function cartoquali_private.validate_registry_update()
returns trigger language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
begin
  if auth.role()<>'service_role' then
    if old.id<>new.id or old.status<>new.status or old.plano<>new.plano or old.data_renovacao is distinct from new.data_renovacao then raise exception 'protected_registry_field' using errcode='42501'; end if;
  end if;
  new.updated_at:=now(); return new;
end;$$;
revoke all on function cartoquali_private.validate_registry_update() from public,anon,authenticated;
grant execute on function cartoquali_private.validate_registry_update() to service_role;
drop trigger if exists validate_registry_update on public.cartorios;
create trigger validate_registry_update before update on public.cartorios for each row execute function cartoquali_private.validate_registry_update();

create or replace function cartoquali_private.audit_administration()
returns trigger language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
declare _actor uuid:=cartoquali_private.current_user_id(); _tenant uuid; _entity text; _entity_id uuid; _action text; _metadata jsonb;
begin
  if tg_table_name='cartorios' then _tenant:=new.id; _entity:='registry'; _entity_id:=new.id; _action:='registry_updated'; _metadata:=jsonb_build_object('before',jsonb_build_object('tradeName',old.nome_fantasia,'phone',old.telefone,'email',old.email,'city',old.cidade,'state',old.estado),'after',jsonb_build_object('tradeName',new.nome_fantasia,'phone',new.telefone,'email',new.email,'city',new.cidade,'state',new.estado));
  elsif tg_table_name='usuarios' then _tenant:=new.cartorio_id; _entity:='user'; _entity_id:=new.id; _action:=case when tg_op='INSERT' then 'user_created' when old.status<>new.status and new.status='ativo' then 'user_activated' when old.status<>new.status then 'user_deactivated' else 'user_updated' end; _metadata:=case when tg_op='INSERT' then jsonb_build_object('name',new.nome,'status',new.status) else jsonb_build_object('before',jsonb_build_object('name',old.nome,'phone',old.telefone,'status',old.status),'after',jsonb_build_object('name',new.nome,'phone',new.telefone,'status',new.status)) end;
  elsif tg_table_name='user_roles' then select cartorio_id into _tenant from public.usuarios where id=new.user_id; _entity:='user'; _entity_id:=new.user_id; _action:=case when tg_op='INSERT' then 'user_role_assigned' else 'user_role_changed' end; _metadata:=jsonb_build_object('beforeRole',case when tg_op='UPDATE' then old.role else null end,'afterRole',new.role);
  elsif tg_table_name='pesquisas' then _tenant:=new.cartorio_id; _entity:='survey'; _entity_id:=new.id; _action:=case when tg_op='INSERT' then 'survey_created' when old.status<>new.status and new.status='ativa' then 'survey_published' when old.status<>new.status then 'survey_unpublished' else 'survey_updated' end; _metadata:=case when tg_op='INSERT' then jsonb_build_object('name',new.nome,'status',new.status) else jsonb_build_object('before',jsonb_build_object('name',old.nome,'status',old.status,'version',old.versao),'after',jsonb_build_object('name',new.nome,'status',new.status,'version',new.versao)) end;
  elsif tg_table_name='perguntas' then select cartorio_id into _tenant from public.pesquisas where id=new.pesquisa_id; _entity:='question'; _entity_id:=new.id; _action:=case when tg_op='INSERT' then 'question_created' else 'question_updated' end; _metadata:=jsonb_build_object('surveyId',new.pesquisa_id,'type',new.tipo,'dimension',new.dimensao,'active',new.ativa,'order',new.ordem);
  elsif tg_table_name='opcoes_resposta' then select p.cartorio_id into _tenant from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=new.pergunta_id; _entity:='answer_option'; _entity_id:=new.id; _action:=case when tg_op='INSERT' then 'answer_option_created' else 'answer_option_updated' end; _metadata:=jsonb_build_object('questionId',new.pergunta_id,'order',new.ordem);
  elsif tg_table_name='configuracoes_cartorio' then _tenant:=new.cartorio_id; _entity:='registry_settings'; _entity_id:=new.id; _action:=case when tg_op='INSERT' then 'registry_settings_created' else 'registry_settings_updated' end; _metadata:=case when tg_op='INSERT' then jsonb_build_object('timezone',new.fuso_horario,'language',new.idioma) else jsonb_build_object('before',jsonb_build_object('displayName',old.nome_exibicao,'timezone',old.fuso_horario,'language',old.idioma,'defaultSurveyId',old.pesquisa_padrao_id),'after',jsonb_build_object('displayName',new.nome_exibicao,'timezone',new.fuso_horario,'language',new.idioma,'defaultSurveyId',new.pesquisa_padrao_id)) end;
  end if;
  if _tenant is not null then insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) values(_tenant,_actor,_action,_entity,_entity_id,coalesce(_metadata,'{}')); end if;
  return new;
end;$$;
revoke all on function cartoquali_private.audit_administration() from public,anon,authenticated;
grant execute on function cartoquali_private.audit_administration() to service_role;

drop trigger if exists audit_registry_administration on public.cartorios;
create trigger audit_registry_administration after update on public.cartorios for each row execute function cartoquali_private.audit_administration();
drop trigger if exists audit_user_administration on public.usuarios;
create trigger audit_user_administration after insert or update on public.usuarios for each row execute function cartoquali_private.audit_administration();
drop trigger if exists audit_user_role_administration on public.user_roles;
create trigger audit_user_role_administration after insert or update on public.user_roles for each row execute function cartoquali_private.audit_administration();
drop trigger if exists audit_survey_administration on public.pesquisas;
create trigger audit_survey_administration after insert or update on public.pesquisas for each row execute function cartoquali_private.audit_administration();
drop trigger if exists audit_question_administration on public.perguntas;
create trigger audit_question_administration after insert or update on public.perguntas for each row execute function cartoquali_private.audit_administration();
drop trigger if exists audit_answer_option_administration on public.opcoes_resposta;
create trigger audit_answer_option_administration after insert or update on public.opcoes_resposta for each row execute function cartoquali_private.audit_administration();
drop trigger if exists audit_settings_administration on public.configuracoes_cartorio;
create trigger audit_settings_administration after insert or update on public.configuracoes_cartorio for each row execute function cartoquali_private.audit_administration();

create or replace function public.create_registry_user(_auth_user_id uuid,_name text,_email text,_phone text,_role text,_status text)
returns jsonb language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
declare _caller public.usuarios%rowtype; _created public.usuarios%rowtype;
begin
  select * into _caller from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then raise exception 'forbidden' using errcode='42501'; end if;
  if _auth_user_id is null or nullif(btrim(_name),'') is null or _email is null or _role not in ('CARTORIO_ADMIN','GESTOR','OPERADOR') or _status not in ('ativo','inativo') then raise exception 'invalid_request' using errcode='22023'; end if;
  insert into public.usuarios(cartorio_id,auth_user_id,nome,email,telefone,status) values(_caller.cartorio_id,_auth_user_id,btrim(_name),lower(btrim(_email)),nullif(btrim(_phone),''),_status) returning * into _created;
  insert into public.user_roles(user_id,role) values(_created.id,_role);
  return jsonb_build_object('id',_created.id);
end;$$;
revoke all on function public.create_registry_user(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.create_registry_user(uuid,text,text,text,text,text) to authenticated,service_role;

create or replace function public.update_registry_user(_id uuid,_name text,_phone text,_role text,_status text)
returns jsonb language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
declare _caller public.usuarios%rowtype; _target public.usuarios%rowtype; _old_role text;
begin
  select * into _caller from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into _target from public.usuarios where id=_id and cartorio_id=_caller.cartorio_id for update;
  if not found then raise exception 'user_not_found' using errcode='P0002'; end if;
  select role into _old_role from public.user_roles where user_id=_target.id order by case role when 'PLATFORM_ADMIN' then 1 when 'CARTORIO_ADMIN' then 2 when 'GESTOR' then 3 else 4 end limit 1;
  if _role not in ('CARTORIO_ADMIN','GESTOR','OPERADOR') or _status not in ('ativo','inativo') or nullif(btrim(_name),'') is null then raise exception 'invalid_request' using errcode='22023'; end if;
  if _target.id=_caller.id and (_status<>'ativo' or _role<>_old_role) then raise exception 'self_access_change' using errcode='42501'; end if;
  if (_old_role='CARTORIO_ADMIN' and (_role<>'CARTORIO_ADMIN' or _status<>'ativo')) and cartoquali_private.is_last_registry_admin(_target.id) then raise exception 'last_registry_admin' using errcode='42501'; end if;
  update public.usuarios set nome=btrim(_name),telefone=nullif(btrim(_phone),''),status=_status where id=_target.id;
  if _old_role is distinct from _role then update public.user_roles set role=_role where id=(select id from public.user_roles where user_id=_target.id order by created_at limit 1); end if;
  return jsonb_build_object('id',_target.id);
end;$$;
revoke all on function public.update_registry_user(uuid,text,text,text,text) from public,anon;
grant execute on function public.update_registry_user(uuid,text,text,text,text) to authenticated,service_role;

create index if not exists audit_logs_cartorio_entity_created_idx on public.audit_logs(cartorio_id,entity,created_at desc);
create index if not exists audit_logs_cartorio_action_created_idx on public.audit_logs(cartorio_id,action,created_at desc);
create index if not exists configuracoes_cartorio_id_idx on public.configuracoes_cartorio(cartorio_id);

insert into public.configuracoes_cartorio(cartorio_id,nome_exibicao,pesquisa_padrao_id)
select c.id,c.nome_fantasia,(select p.id from public.pesquisas p where p.cartorio_id=c.id and p.status='ativa' order by p.created_at limit 1)
from public.cartorios c
on conflict(cartorio_id) do nothing;