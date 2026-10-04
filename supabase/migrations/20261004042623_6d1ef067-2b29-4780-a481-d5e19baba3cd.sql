CREATE OR REPLACE FUNCTION cartoquali_private.audit_evaluation_point() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE v_user_id uuid; v_platform_actor uuid; v_action text; v_metadata jsonb;
BEGIN
 SELECT u.id INTO v_user_id FROM public.usuarios u WHERE u.auth_user_id=auth.uid() AND u.cartorio_id=new.cartorio_id AND u.status='ativo';
 IF v_user_id IS NULL THEN SELECT u.id INTO v_platform_actor FROM public.usuarios u JOIN public.user_roles r ON r.user_id=u.id WHERE u.auth_user_id=auth.uid() AND u.status='ativo' AND r.role='PLATFORM_ADMIN' LIMIT 1; END IF;
 IF tg_op='INSERT' THEN v_action:='evaluation_point_created';
 ELSIF old.status<>new.status AND new.status='ativo' THEN v_action:='evaluation_point_activated';
 ELSIF old.status<>new.status AND new.status='inativo' THEN v_action:='evaluation_point_deactivated';
 ELSIF old.pesquisa_id<>new.pesquisa_id THEN v_action:='evaluation_point_survey_changed';
 ELSIF old.codigo<>new.codigo THEN v_action:='evaluation_point_code_changed'; ELSE v_action:='evaluation_point_updated'; END IF;
 v_metadata:=CASE WHEN tg_op='INSERT' THEN jsonb_build_object('name',new.nome,'code',new.codigo,'status',new.status,'surveyId',new.pesquisa_id) ELSE jsonb_build_object('before',jsonb_build_object('name',old.nome,'code',old.codigo,'location',old.localizacao,'status',old.status,'surveyId',old.pesquisa_id),'after',jsonb_build_object('name',new.nome,'code',new.codigo,'location',new.localizacao,'status',new.status,'surveyId',new.pesquisa_id)) END;
 IF v_user_id IS NULL AND v_platform_actor IS NOT NULL THEN v_metadata:=v_metadata||jsonb_build_object('platform_actor_id',v_platform_actor); END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(new.cartorio_id,v_user_id,v_action,'evaluation_point',new.id,v_metadata);
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.audit_evaluation_point() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.audit_evaluation_point() TO service_role;