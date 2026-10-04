CREATE OR REPLACE FUNCTION cartoquali_private.onboarding_audit(_cartorio_id uuid,_actor uuid,_action text,_entity text,_entity_id uuid,_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
 VALUES(_cartorio_id,CASE WHEN EXISTS(SELECT 1 FROM public.usuarios WHERE id=_actor AND cartorio_id=_cartorio_id) THEN _actor ELSE NULL END,_action,_entity,_entity_id,coalesce(_metadata,'{}'::jsonb)||CASE WHEN _actor IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.usuarios WHERE id=_actor AND cartorio_id=_cartorio_id) THEN jsonb_build_object('platform_actor_id',_actor) ELSE '{}'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.onboarding_audit(uuid,uuid,text,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.onboarding_audit(uuid,uuid,text,text,uuid,jsonb) TO service_role;

DO $$
DECLARE r record; ddl text;
BEGIN
 FOR r IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='cartoquali_private' AND p.proname IN ('create_onboarding_administrator','save_onboarding_survey','publish_onboarding_survey','save_onboarding_point','prepare_onboarding_test','set_onboarding_operational_status') LOOP
  SELECT pg_get_functiondef(r.sig) INTO ddl;
  ddl:=replace(ddl,'INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,','PERFORM cartoquali_private.onboarding_audit(_cartorio_id,_caller,');
  ddl:=replace(ddl,'INSERT INTO public.audit_logs (cartorio_id, user_id, action, entity, entity_id, metadata) VALUES (_cartorio_id, _caller,','PERFORM cartoquali_private.onboarding_audit(_cartorio_id,_caller,');
  EXECUTE ddl;
 END LOOP;
END $$;