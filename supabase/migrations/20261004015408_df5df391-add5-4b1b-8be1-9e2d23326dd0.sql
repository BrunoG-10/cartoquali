ALTER FUNCTION public.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.create_onboarding_administrator(uuid,uuid,text,text,text) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.save_onboarding_survey(uuid,text,text,boolean) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.publish_onboarding_survey(uuid) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.save_onboarding_point(uuid,text,text,text) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.prepare_onboarding_test(uuid) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.set_onboarding_operational_status(uuid,text) SET SCHEMA cartoquali_private;
ALTER FUNCTION public.get_onboarding_checklist(uuid) SET SCHEMA cartoquali_private;
REVOKE ALL ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.create_onboarding_administrator(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.save_onboarding_survey(uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.publish_onboarding_survey(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.set_onboarding_operational_status(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cartoquali_private.get_onboarding_checklist(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.create_onboarding_administrator(uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_survey(uuid,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.publish_onboarding_survey(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.set_onboarding_operational_status(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.get_onboarding_checklist(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_onboarding_checklist(_cartorio_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='public','cartoquali_private','pg_temp' AS $$ SELECT cartoquali_private.get_onboarding_checklist($1) $$;
REVOKE ALL ON FUNCTION public.get_onboarding_checklist(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_checklist(uuid) TO authenticated,service_role;