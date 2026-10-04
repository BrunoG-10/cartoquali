DO $$
DECLARE r record; ddl text;
BEGIN
 FOR r IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='cartoquali_private' AND p.proname IN ('save_onboarding_survey','publish_onboarding_survey','save_onboarding_point','prepare_onboarding_test','set_onboarding_operational_status','create_onboarding_administrator','get_onboarding_checklist') LOOP
  SELECT pg_get_functiondef(r.sig) INTO ddl;
  ddl:=replace(ddl,'FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id','FROM public.cartorio_onboarding o WHERE o.cartorio_id=_cartorio_id');
  ddl:=replace(ddl,'UPDATE public.cartorio_onboarding SET ','UPDATE public.cartorio_onboarding o SET ');
  ddl:=replace(ddl,' WHERE cartorio_id=_cartorio_id',' WHERE o.cartorio_id=_cartorio_id');
  EXECUTE ddl;
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION cartoquali_private.get_onboarding_checklist(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.create_onboarding_administrator(uuid,uuid,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_survey(uuid,text,text,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.publish_onboarding_survey(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.set_onboarding_operational_status(uuid,text) TO authenticated,service_role;