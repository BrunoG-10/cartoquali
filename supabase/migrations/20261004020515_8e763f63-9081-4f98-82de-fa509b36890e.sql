GRANT EXECUTE ON FUNCTION cartoquali_private.create_onboarding_administrator(uuid,uuid,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_survey(uuid,text,text,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.publish_onboarding_survey(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION cartoquali_private.set_onboarding_operational_status(uuid,text) TO authenticated,service_role;