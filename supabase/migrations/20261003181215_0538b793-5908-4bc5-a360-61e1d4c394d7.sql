create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  request_type text not null check (request_type in ('confirmacao','acesso','correcao','informacao','eliminacao','oposicao','revogacao','outro')),
  description text not null check (char_length(btrim(description)) between 3 and 4000),
  status text not null default 'recebida' check (status in ('recebida','em_analise','aguardando_validacao','concluida','indeferida','cancelada')),
  requester_contact text check (requester_contact is null or char_length(btrim(requester_contact)) between 3 and 255),
  responsible_user_id uuid references public.usuarios(id) on delete set null,
  evaluation_id uuid references public.avaliacoes(id) on delete set null,
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 4000),
  created_by_id uuid not null references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint privacy_requests_resolved_state check ((status in ('concluida','indeferida','cancelada')) = (resolved_at is not null))
);
grant select, insert, update on public.privacy_requests to authenticated;
grant all on public.privacy_requests to service_role;
alter table public.privacy_requests enable row level security;
create policy privacy_requests_select_admin_tenant on public.privacy_requests for select to authenticated using (
  cartorio_id = cartoquali_private.current_cartorio_id()
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
);
create policy privacy_requests_insert_admin_tenant on public.privacy_requests for insert to authenticated with check (
  cartorio_id = cartoquali_private.current_cartorio_id()
  and created_by_id = cartoquali_private.current_user_id()
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
  and (responsible_user_id is null or exists (
    select 1 from public.usuarios u where u.id=responsible_user_id and u.cartorio_id=cartorio_id and u.status='ativo'
  ))
  and (evaluation_id is null or exists (
    select 1 from public.avaliacoes a where a.id=evaluation_id and a.cartorio_id=cartorio_id
  ))
);
create policy privacy_requests_update_admin_tenant on public.privacy_requests for update to authenticated using (
  cartorio_id = cartoquali_private.current_cartorio_id()
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
) with check (
  cartorio_id = cartoquali_private.current_cartorio_id()
  and created_by_id = cartoquali_private.current_user_id() or (
    cartorio_id = cartoquali_private.current_cartorio_id()
    and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
  )
);

create index privacy_requests_cartorio_created_idx on public.privacy_requests(cartorio_id, created_at desc);
create index privacy_requests_cartorio_status_idx on public.privacy_requests(cartorio_id, status, created_at desc);
create index privacy_requests_cartorio_type_idx on public.privacy_requests(cartorio_id, request_type, created_at desc);
create index privacy_requests_responsible_idx on public.privacy_requests(responsible_user_id) where responsible_user_id is not null;
create index privacy_requests_evaluation_idx on public.privacy_requests(evaluation_id) where evaluation_id is not null;

alter table public.configuracoes_cartorio
  add column privacy_contact_channel text,
  add column privacy_notice_version text not null default '1.0',
  add column privacy_notice_effective_at date,
  add column evaluation_retention_days integer,
  add column contact_retention_days integer,
  add column audit_retention_days integer,
  add constraint configurations_privacy_contact_length check (privacy_contact_channel is null or char_length(btrim(privacy_contact_channel)) between 3 and 255),
  add constraint configurations_privacy_notice_version_length check (char_length(btrim(privacy_notice_version)) between 1 and 30),
  add constraint configurations_evaluation_retention check (evaluation_retention_days is null or evaluation_retention_days between 30 and 36500),
  add constraint configurations_contact_retention check (contact_retention_days is null or contact_retention_days between 1 and 3650),
  add constraint configurations_audit_retention check (audit_retention_days is null or audit_retention_days between 30 and 36500);

alter table public.avaliacoes
  add column contact_consent_version text,
  add column contact_consent_at timestamptz,
  add column minimized_at timestamptz,
  add constraint evaluations_contact_consent_consistency check (
    (deseja_contato and contact_consent_version is not null and contact_consent_at is not null)
    or (not deseja_contato and contact_consent_version is null and contact_consent_at is null)
  );

create or replace function cartoquali_private.validate_privacy_request()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
begin
  if tg_op='UPDATE' then
    if new.cartorio_id<>old.cartorio_id or new.created_by_id<>old.created_by_id or new.created_at<>old.created_at then
      raise exception 'immutable_privacy_request_fields' using errcode='22023';
    end if;
    if old.status in ('concluida','indeferida','cancelada') and new.status<>old.status then
      raise exception 'privacy_request_closed' using errcode='22023';
    end if;
  end if;
  if new.responsible_user_id is not null and not exists (
    select 1 from public.usuarios u where u.id=new.responsible_user_id and u.cartorio_id=new.cartorio_id and u.status='ativo'
  ) then raise exception 'invalid_responsible' using errcode='22023'; end if;
  if new.evaluation_id is not null and not exists (
    select 1 from public.avaliacoes a where a.id=new.evaluation_id and a.cartorio_id=new.cartorio_id
  ) then raise exception 'invalid_evaluation' using errcode='22023'; end if;
  new.description:=btrim(new.description);
  new.requester_contact:=nullif(btrim(new.requester_contact),'');
  new.internal_notes:=nullif(btrim(new.internal_notes),'');
  new.updated_at:=now();
  if new.status in ('concluida','indeferida','cancelada') then new.resolved_at:=coalesce(new.resolved_at,now()); else new.resolved_at:=null; end if;
  return new;
end $$;
revoke all on function cartoquali_private.validate_privacy_request() from public,anon,authenticated;
grant execute on function cartoquali_private.validate_privacy_request() to service_role;
create trigger validate_privacy_request before insert or update on public.privacy_requests for each row execute function cartoquali_private.validate_privacy_request();

create or replace function cartoquali_private.audit_privacy_request()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare _actor uuid; _action text;
begin
  select id into _actor from public.usuarios where auth_user_id=auth.uid() and cartorio_id=new.cartorio_id and status='ativo';
  _action:=case when tg_op='INSERT' then 'privacy_request_created' when new.status<>old.status then 'privacy_request_status_changed' when new.responsible_user_id is distinct from old.responsible_user_id then 'privacy_request_assigned' else 'privacy_request_updated' end;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(new.cartorio_id,_actor,_action,'privacy_request',new.id,jsonb_build_object('request_type',new.request_type,'status',new.status,'has_requester_contact',new.requester_contact is not null,'has_internal_notes',new.internal_notes is not null));
  return new;
end $$;
revoke all on function cartoquali_private.audit_privacy_request() from public,anon,authenticated;
grant execute on function cartoquali_private.audit_privacy_request() to service_role;
create trigger audit_privacy_request after insert or update on public.privacy_requests for each row execute function cartoquali_private.audit_privacy_request();

create or replace function public.log_privacy_event(_action text, _entity text, _entity_id uuid, _metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security invoker
set search_path = public, cartoquali_private, pg_temp
as $$
declare _user public.usuarios%rowtype;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then raise exception 'unauthorized' using errcode='42501'; end if;
  if _action not in ('restricted_contact_viewed','operational_report_exported','personal_data_exported') or _entity not in ('evaluation','quality_report','privacy_request') then raise exception 'invalid_event' using errcode='22023'; end if;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(_user.cartorio_id,_user.id,_action,_entity,_entity_id,coalesce(_metadata,'{}'::jsonb) - 'name' - 'email' - 'phone' - 'contact' - 'description' - 'comment');
end $$;
revoke all on function public.log_privacy_event(text,text,uuid,jsonb) from public,anon;
grant execute on function public.log_privacy_event(text,text,uuid,jsonb) to authenticated,service_role;

create or replace function public.minimize_evaluation_personal_data(_evaluation_id uuid, _privacy_request_id uuid, _redact_free_text boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare _user public.usuarios%rowtype; _request public.privacy_requests%rowtype; _evaluation public.avaliacoes%rowtype;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into _request from public.privacy_requests where id=_privacy_request_id and cartorio_id=_user.cartorio_id for update;
  if not found or _request.evaluation_id is distinct from _evaluation_id then raise exception 'privacy_request_not_found' using errcode='P0002'; end if;
  select * into _evaluation from public.avaliacoes where id=_evaluation_id and cartorio_id=_user.cartorio_id for update;
  if not found then raise exception 'evaluation_not_found' using errcode='P0002'; end if;
  update public.avaliacoes set deseja_contato=false,nome_contato=null,telefone_contato=null,email_contato=null,contact_consent_version=null,contact_consent_at=null,minimized_at=now(),comentario=case when _redact_free_text then null else comentario end,motivo_insatisfacao=case when _redact_free_text then null else motivo_insatisfacao end where id=_evaluation.id;
  if _redact_free_text then
    update public.respostas r set valor=to_jsonb('[Conteúdo redigido por solicitação de privacidade]'::text),resposta_texto='[Conteúdo redigido por solicitação de privacidade]'
    from public.perguntas q where r.avaliacao_id=_evaluation.id and r.pergunta_id=q.id and q.tipo='text';
  end if;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(_user.cartorio_id,_user.id,'evaluation_personal_data_minimized','evaluation',_evaluation.id,jsonb_build_object('privacy_request_id',_request.id,'contact_removed',true,'free_text_redacted',_redact_free_text));
  return jsonb_build_object('id',_evaluation.id,'minimized',true);
end $$;
revoke all on function public.minimize_evaluation_personal_data(uuid,uuid,boolean) from public,anon;
grant execute on function public.minimize_evaluation_personal_data(uuid,uuid,boolean) to authenticated,service_role;

create or replace function cartoquali_private.prevent_privacy_request_delete()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin raise exception 'privacy_request_delete_forbidden' using errcode='42501'; end $$;
revoke all on function cartoquali_private.prevent_privacy_request_delete() from public,anon,authenticated;
grant execute on function cartoquali_private.prevent_privacy_request_delete() to service_role;
create trigger prevent_privacy_request_delete before delete on public.privacy_requests for each row execute function cartoquali_private.prevent_privacy_request_delete();