create table public.evaluation_contacts (
  evaluation_id uuid primary key references public.avaliacoes(id) on delete cascade,
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  name text check (name is null or char_length(btrim(name)) between 1 and 100),
  phone text check (phone is null or char_length(btrim(phone)) between 3 and 30),
  email text check (email is null or char_length(btrim(email)) between 3 and 255),
  consent_version text not null check (char_length(btrim(consent_version)) between 1 and 30),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_contacts_channel check (phone is not null or email is not null)
);
grant select, delete on public.evaluation_contacts to authenticated;
grant all on public.evaluation_contacts to service_role;
alter table public.evaluation_contacts enable row level security;
create policy evaluation_contacts_select_admin_tenant on public.evaluation_contacts for select to authenticated using (
  cartorio_id=cartoquali_private.current_cartorio_id()
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
);
create policy evaluation_contacts_delete_admin_tenant on public.evaluation_contacts for delete to authenticated using (
  cartorio_id=cartoquali_private.current_cartorio_id()
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
);
create index evaluation_contacts_cartorio_created_idx on public.evaluation_contacts(cartorio_id,created_at desc);

create or replace function cartoquali_private.separate_evaluation_contact()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.deseja_contato and (new.telefone_contato is not null or new.email_contato is not null) then
    insert into public.evaluation_contacts(evaluation_id,cartorio_id,name,phone,email,consent_version,consent_at)
    values(new.id,new.cartorio_id,new.nome_contato,new.telefone_contato,new.email_contato,coalesce(new.contact_consent_version,'1.0'),coalesce(new.contact_consent_at,now()))
    on conflict(evaluation_id) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,consent_version=excluded.consent_version,consent_at=excluded.consent_at,updated_at=now();
    update public.avaliacoes set nome_contato=null,telefone_contato=null,email_contato=null where id=new.id;
  end if;
  return new;
end $$;
revoke all on function cartoquali_private.separate_evaluation_contact() from public,anon,authenticated;
grant execute on function cartoquali_private.separate_evaluation_contact() to service_role;
create trigger separate_evaluation_contact after insert on public.avaliacoes for each row execute function cartoquali_private.separate_evaluation_contact();

create or replace function cartoquali_private.minimize_evaluation_personal_data(_evaluation_id uuid, _privacy_request_id uuid, _redact_free_text boolean default true)
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
  delete from public.evaluation_contacts where evaluation_id=_evaluation.id and cartorio_id=_user.cartorio_id;
  update public.avaliacoes set deseja_contato=false,nome_contato=null,telefone_contato=null,email_contato=null,contact_consent_version=null,contact_consent_at=null,minimized_at=now(),comentario=case when _redact_free_text then null else comentario end,motivo_insatisfacao=case when _redact_free_text then null else motivo_insatisfacao end where id=_evaluation.id;
  if _redact_free_text then
    update public.respostas r set valor=to_jsonb('[Conteúdo redigido por solicitação de privacidade]'::text),resposta_texto='[Conteúdo redigido por solicitação de privacidade]'
    from public.perguntas q where r.avaliacao_id=_evaluation.id and r.pergunta_id=q.id and q.tipo='text';
  end if;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(_user.cartorio_id,_user.id,'evaluation_personal_data_minimized','evaluation',_evaluation.id,jsonb_build_object('privacy_request_id',_request.id,'contact_removed',true,'free_text_redacted',_redact_free_text));
  return jsonb_build_object('id',_evaluation.id,'minimized',true);
end $$;