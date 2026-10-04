CREATE OR REPLACE FUNCTION cartoquali_private.audit_onboarding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid; v_platform_actor uuid; v_metadata jsonb;
BEGIN
 SELECT u.id INTO v_actor FROM public.usuarios u WHERE u.auth_user_id=auth.uid() AND u.cartorio_id=new.cartorio_id AND u.status='ativo';
 IF v_actor IS NULL THEN SELECT u.id INTO v_platform_actor FROM public.usuarios u JOIN public.user_roles r ON r.user_id=u.id WHERE u.auth_user_id=auth.uid() AND u.status='ativo' AND r.role='PLATFORM_ADMIN' LIMIT 1; END IF;
 v_metadata:=jsonb_build_object('status',new.status,'current_step',new.current_step)||CASE WHEN v_actor IS NULL AND v_platform_actor IS NOT NULL THEN jsonb_build_object('platform_actor_id',v_platform_actor) ELSE '{}'::jsonb END;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(new.cartorio_id,v_actor,'ONBOARDING_PROGRESS_UPDATED','onboarding',new.id,v_metadata);
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.audit_onboarding() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.audit_onboarding() TO service_role;