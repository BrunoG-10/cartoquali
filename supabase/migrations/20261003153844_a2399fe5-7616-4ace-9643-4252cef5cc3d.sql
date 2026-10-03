create or replace function cartoquali_private.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = cartoquali_private.current_user_id()
      and ur.role = any(allowed_roles)
  )
$$;
revoke all on function cartoquali_private.has_any_role(text[]) from public, anon;
grant execute on function cartoquali_private.has_any_role(text[]) to authenticated, service_role;

alter policy cartorios_update_own_tenant on public.cartorios
using (id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])))
with check (id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])));

alter policy usuarios_insert_own_tenant on public.usuarios
with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])));
alter policy usuarios_update_own_tenant on public.usuarios
using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])))
with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])));
alter policy usuarios_delete_own_tenant on public.usuarios
using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])));

alter policy user_roles_insert_own_tenant on public.user_roles
with check ((select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])) and exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy user_roles_update_own_tenant on public.user_roles
using ((select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])) and exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())))
with check ((select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])) and exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy user_roles_delete_own_tenant on public.user_roles
using ((select cartoquali_private.has_any_role(array['CARTORIO_ADMIN']::text[])) and exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));