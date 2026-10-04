CREATE OR REPLACE FUNCTION cartoquali_private.validate_registry_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()<>'service_role' THEN
  IF old.id<>new.id OR old.plano<>new.plano OR old.data_renovacao IS DISTINCT FROM new.data_renovacao THEN RAISE EXCEPTION 'protected_registry_field' USING ERRCODE='42501'; END IF;
  IF old.status<>new.status AND NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'protected_registry_field' USING ERRCODE='42501'; END IF;
 END IF;
 new.updated_at:=now(); RETURN new;
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.validate_registry_update() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.validate_registry_update() TO service_role;