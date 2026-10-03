create or replace function cartoquali_private.create_registry_user(_auth_user_id uuid,_name text,_email text,_phone text,_role text,_status text)
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
revoke all on function cartoquali_private.create_registry_user(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function cartoquali_private.create_registry_user(uuid,text,text,text,text,text) to service_role;

create or replace function cartoquali_private.update_registry_user(_id uuid,_name text,_phone text,_role text,_status text)
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
revoke all on function cartoquali_private.update_registry_user(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function cartoquali_private.update_registry_user(uuid,text,text,text,text) to service_role;

create or replace function public.create_registry_user(_auth_user_id uuid,_name text,_email text,_phone text,_role text,_status text)
returns jsonb language sql security invoker set search_path='public','cartoquali_private','pg_temp' as $$
  select cartoquali_private.create_registry_user($1,$2,$3,$4,$5,$6)
$$;
create or replace function public.update_registry_user(_id uuid,_name text,_phone text,_role text,_status text)
returns jsonb language sql security invoker set search_path='public','cartoquali_private','pg_temp' as $$
  select cartoquali_private.update_registry_user($1,$2,$3,$4,$5)
$$;
revoke all on function public.create_registry_user(uuid,text,text,text,text,text) from public,anon;
revoke all on function public.update_registry_user(uuid,text,text,text,text) from public,anon;
grant execute on function public.create_registry_user(uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.update_registry_user(uuid,text,text,text,text) to authenticated,service_role;
grant execute on function cartoquali_private.create_registry_user(uuid,text,text,text,text,text) to authenticated;
grant execute on function cartoquali_private.update_registry_user(uuid,text,text,text,text) to authenticated;