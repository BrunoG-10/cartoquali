alter policy usuarios_select_own_tenant on public.usuarios using (
  (auth_user_id=auth.uid() and status='ativo')
  or (
    cartorio_id=(select cartoquali_private.current_cartorio_id())
    and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[]))
  )
);
alter policy user_roles_select_own_tenant on public.user_roles using (
  user_id=(select cartoquali_private.current_user_id())
  or (
    exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))
    and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']::text[]))
  )
);