-- Platform administrators are not managed through the registry users screen.
-- Without this guard a registry administrator could call update_registry_user on a
-- PLATFORM_ADMIN of the same registry and overwrite one of their roles.
-- Body identical to 20261003175513 except for the platform_admin_protected check.
create or replace function cartoquali_private.update_registry_user(_id uuid,_name text,_phone text,_role text,_status text)
returns jsonb language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
declare _caller public.usuarios%rowtype; _target public.usuarios%rowtype; _old_role text;
begin
  select * into _caller from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into _target from public.usuarios where id=_id and cartorio_id=_caller.cartorio_id for update;
  if not found then raise exception 'user_not_found' using errcode='P0002'; end if;
  if exists(select 1 from public.user_roles where user_id=_target.id and role='PLATFORM_ADMIN') then raise exception 'platform_admin_protected' using errcode='42501'; end if;
  select role into _old_role from public.user_roles where user_id=_target.id order by case role when 'PLATFORM_ADMIN' then 1 when 'CARTORIO_ADMIN' then 2 when 'GESTOR' then 3 else 4 end limit 1;
  if _role not in ('CARTORIO_ADMIN','GESTOR','OPERADOR') or _status not in ('ativo','inativo') or nullif(btrim(_name),'') is null then raise exception 'invalid_request' using errcode='22023'; end if;
  if _target.id=_caller.id and (_status<>'ativo' or _role<>_old_role) then raise exception 'self_access_change' using errcode='42501'; end if;
  if (_old_role='CARTORIO_ADMIN' and (_role<>'CARTORIO_ADMIN' or _status<>'ativo')) and cartoquali_private.is_last_registry_admin(_target.id) then raise exception 'last_registry_admin' using errcode='42501'; end if;
  update public.usuarios set nome=btrim(_name),telefone=nullif(btrim(_phone),''),status=_status where id=_target.id;
  if _old_role is distinct from _role then update public.user_roles set role=_role where id=(select id from public.user_roles where user_id=_target.id order by created_at limit 1); end if;
  return jsonb_build_object('id',_target.id);
end;$$;
