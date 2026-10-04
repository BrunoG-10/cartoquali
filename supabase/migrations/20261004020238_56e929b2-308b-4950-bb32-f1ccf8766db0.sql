REVOKE EXECUTE ON FUNCTION cartoquali_private.get_onboarding_checklist(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.create_onboarding_administrator(uuid,uuid,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.save_onboarding_survey(uuid,text,text,boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.publish_onboarding_survey(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cartoquali_private.set_onboarding_operational_status(uuid,text) FROM authenticated;