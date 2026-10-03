DROP POLICY IF EXISTS user_roles_insert_own_tenant ON public.user_roles;
CREATE POLICY user_roles_insert_own_tenant ON public.user_roles FOR INSERT TO authenticated WITH CHECK (
  role <> 'PLATFORM_ADMIN'
  AND (SELECT cartoquali_private.has_any_role(ARRAY['CARTORIO_ADMIN']))
  AND EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = user_roles.user_id
      AND u.cartorio_id = (SELECT cartoquali_private.current_cartorio_id())
  )
);

DROP POLICY IF EXISTS user_roles_update_own_tenant ON public.user_roles;
CREATE POLICY user_roles_update_own_tenant ON public.user_roles FOR UPDATE TO authenticated USING (
  role <> 'PLATFORM_ADMIN'
  AND (SELECT cartoquali_private.has_any_role(ARRAY['CARTORIO_ADMIN']))
  AND EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = user_roles.user_id
      AND u.cartorio_id = (SELECT cartoquali_private.current_cartorio_id())
  )
) WITH CHECK (
  role <> 'PLATFORM_ADMIN'
  AND (SELECT cartoquali_private.has_any_role(ARRAY['CARTORIO_ADMIN']))
  AND EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = user_roles.user_id
      AND u.cartorio_id = (SELECT cartoquali_private.current_cartorio_id())
  )
);