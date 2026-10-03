revoke all on public.privacy_requests from anon;
revoke all on public.evaluation_contacts from anon;
revoke all on public.privacy_requests from authenticated;
grant select, insert, update on public.privacy_requests to authenticated;
revoke all on public.evaluation_contacts from authenticated;
grant select, delete on public.evaluation_contacts to authenticated;
grant all on public.privacy_requests to service_role;
grant all on public.evaluation_contacts to service_role;

create or replace function cartoquali_private.audit_administration()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _cartorio_id uuid; _entity text; _entity_id uuid; _action text; _actor uuid; _metadata jsonb;
begin
  if tg_table_name='cartorios' then
    _cartorio_id:=coalesce(new.id,old.id);
  elsif tg_table_name='user_roles' then
    select cartorio_id into _cartorio_id from public.usuarios where id=coalesce(new.user_id,old.user_id);
  else
    _cartorio_id:=coalesce(new.cartorio_id,old.cartorio_id);
  end if;
  _entity_id:=coalesce(new.id,old.id);
  select id into _actor from public.usuarios where auth_user_id=auth.uid() and cartorio_id=_cartorio_id and status='ativo';
  _entity:=case tg_table_name when 'cartorios' then 'registry' when 'usuarios' then 'user' when 'user_roles' then 'user' when 'configuracoes_cartorio' then 'registry_settings' when 'pesquisas' then 'survey' when 'perguntas' then 'question' when 'opcoes_resposta' then 'answer_option' else tg_table_name end;
  _action:=case when tg_op='INSERT' then _entity||'_created' else _entity||'_updated' end;
  _metadata:=jsonb_build_object('operation',lower(tg_op),'changed_at',now());
  if tg_table_name='usuarios' then
    _metadata:=_metadata||jsonb_build_object('status',new.status,'has_phone',new.telefone is not null,'email_changed',case when tg_op='UPDATE' then new.email is distinct from old.email else false end);
  elsif tg_table_name='cartorios' then
    _metadata:=_metadata||jsonb_build_object('status',new.status,'has_phone',new.telefone is not null,'has_email',new.email is not null);
  elsif tg_table_name='user_roles' then
    _metadata:=_metadata||jsonb_build_object('role',new.role,'user_id',new.user_id);
  end if;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) values(_cartorio_id,_actor,_action,_entity,_entity_id,_metadata);
  return new;
end $$;