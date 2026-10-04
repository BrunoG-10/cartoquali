ALTER TABLE public.cartorios ADD COLUMN IF NOT EXISTS environment_kind text NOT NULL DEFAULT 'real' CHECK (environment_kind IN ('real','demo'));
UPDATE public.cartorios SET environment_kind='demo' WHERE environment_kind='real' AND (upper(nome_fantasia) LIKE '%DEMO%' OR upper(razao_social) LIKE '%DEMO%' OR upper(nome_fantasia) LIKE '%TESTE%' OR upper(razao_social) LIKE '%TESTE%');

CREATE OR REPLACE FUNCTION public.onboarding_get_onboarding_checklist(_cartorio_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.get_onboarding_checklist(_cartorio_id) $$;
CREATE OR REPLACE FUNCTION public.onboarding_create_cartorio_onboarding(_client_request_id uuid,_razao_social text,_nome_fantasia text,_cnpj text,_tipo text,_cidade text,_estado text,_responsavel text,_email text DEFAULT NULL,_telefone text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.create_cartorio_onboarding(_client_request_id,_razao_social,_nome_fantasia,_cnpj,_tipo,_cidade,_estado,_responsavel,_email,_telefone) $$;
CREATE OR REPLACE FUNCTION public.onboarding_create_onboarding_administrator(_cartorio_id uuid,_auth_user_id uuid,_name text,_email text,_phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.create_onboarding_administrator(_cartorio_id,_auth_user_id,_name,_email,_phone) $$;
CREATE OR REPLACE FUNCTION public.onboarding_save_onboarding_survey(_cartorio_id uuid,_name text,_description text,_use_template boolean DEFAULT true)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.save_onboarding_survey(_cartorio_id,_name,_description,_use_template) $$;
CREATE OR REPLACE FUNCTION public.onboarding_publish_onboarding_survey(_cartorio_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.publish_onboarding_survey(_cartorio_id) $$;
CREATE OR REPLACE FUNCTION public.onboarding_save_onboarding_point(_cartorio_id uuid,_name text,_location text,_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.save_onboarding_point(_cartorio_id,_name,_location,_description) $$;
CREATE OR REPLACE FUNCTION public.onboarding_prepare_onboarding_test(_cartorio_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.prepare_onboarding_test(_cartorio_id) $$;
CREATE OR REPLACE FUNCTION public.onboarding_set_onboarding_operational_status(_cartorio_id uuid,_action text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT cartoquali_private.set_onboarding_operational_status(_cartorio_id,_action) $$;

REVOKE ALL ON FUNCTION public.onboarding_get_onboarding_checklist(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_create_onboarding_administrator(uuid,uuid,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_save_onboarding_survey(uuid,text,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_publish_onboarding_survey(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_save_onboarding_point(uuid,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_prepare_onboarding_test(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.onboarding_set_onboarding_operational_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.onboarding_get_onboarding_checklist(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_create_onboarding_administrator(uuid,uuid,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_save_onboarding_survey(uuid,text,text,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_publish_onboarding_survey(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_save_onboarding_point(uuid,text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_prepare_onboarding_test(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_set_onboarding_operational_status(uuid,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION cartoquali_private.create_cartorio_onboarding(_client_request_id uuid,_razao_social text,_nome_fantasia text,_cnpj text,_tipo text,_cidade text,_estado text,_responsavel text,_email text DEFAULT NULL,_telefone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _cartorio_id uuid; _onboarding_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 IF _client_request_id IS NULL OR nullif(btrim(_razao_social),'') IS NULL OR nullif(btrim(_nome_fantasia),'') IS NULL OR nullif(regexp_replace(_cnpj,'[^0-9]','','g'),'') IS NULL OR nullif(btrim(_tipo),'') IS NULL OR nullif(btrim(_cidade),'') IS NULL OR length(upper(btrim(_estado)))<>2 OR nullif(btrim(_responsavel),'') IS NULL THEN RAISE EXCEPTION 'invalid_registry' USING ERRCODE='22023'; END IF;
 SELECT cartorio_id INTO _cartorio_id FROM public.cartorio_onboarding WHERE client_request_id=_client_request_id;
 IF _cartorio_id IS NOT NULL THEN RETURN jsonb_build_object('id',_cartorio_id,'duplicate',true); END IF;
 IF EXISTS(SELECT 1 FROM public.cartorios WHERE regexp_replace(cnpj,'[^0-9]','','g')=regexp_replace(_cnpj,'[^0-9]','','g')) THEN RAISE EXCEPTION 'duplicate_registry' USING ERRCODE='23505'; END IF;
 INSERT INTO public.cartorios(razao_social,nome_fantasia,cnpj,tipo,telefone,email,cidade,estado,responsavel,status,plano,environment_kind)
 VALUES(btrim(_razao_social),btrim(_nome_fantasia),regexp_replace(_cnpj,'[^0-9]','','g'),btrim(_tipo),nullif(btrim(_telefone),''),nullif(lower(btrim(_email)),''),btrim(_cidade),upper(btrim(_estado)),btrim(_responsavel),'inativo','Implantação','real') RETURNING id INTO _cartorio_id;
 INSERT INTO public.configuracoes_cartorio(cartorio_id,nome_exibicao) VALUES(_cartorio_id,btrim(_nome_fantasia));
 INSERT INTO public.cartorio_onboarding(cartorio_id,client_request_id,created_by_id) VALUES(_cartorio_id,_client_request_id,_caller) RETURNING id INTO _onboarding_id;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'CARTORIO_CREATED','registry',_cartorio_id,jsonb_build_object('environment','real'));
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_STARTED','onboarding',_onboarding_id,jsonb_build_object('source','platform_admin'));
 RETURN jsonb_build_object('id',_cartorio_id,'onboardingId',_onboarding_id,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION cartoquali_private.save_onboarding_point(_cartorio_id uuid,_name text,_location text,_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _survey_id uuid; _point_id uuid; _code text; _attempt int:=0; _created boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 SELECT survey_id,point_id INTO _survey_id,_point_id FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id;
 IF _survey_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.pesquisas WHERE id=_survey_id AND cartorio_id=_cartorio_id AND status='ativa') THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(_name),'') IS NULL OR nullif(btrim(_location),'') IS NULL THEN RAISE EXCEPTION 'invalid_point' USING ERRCODE='22023'; END IF;
 IF _point_id IS NULL THEN
  LOOP _attempt:=_attempt+1; _code:='CQ-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.pontos_avaliacao WHERE lower(codigo)=lower(_code) OR public_slug=lower(_code)); IF _attempt>5 THEN RAISE EXCEPTION 'code_generation_failed'; END IF; END LOOP;
  INSERT INTO public.pontos_avaliacao(cartorio_id,pesquisa_id,nome,localizacao,codigo,descricao,status,public_slug,metodo) VALUES(_cartorio_id,_survey_id,btrim(_name),btrim(_location),_code,nullif(btrim(_description),''),'inativo',lower(_code),'link_qr_nfc') RETURNING id INTO _point_id; _created:=true;
  UPDATE public.cartorio_onboarding SET point_id=_point_id,current_step=greatest(current_step,5) WHERE cartorio_id=_cartorio_id;
 ELSE UPDATE public.pontos_avaliacao SET nome=btrim(_name),localizacao=btrim(_location),descricao=nullif(btrim(_description),''),updated_at=now() WHERE id=_point_id AND cartorio_id=_cartorio_id RETURNING codigo INTO _code;
 END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,CASE WHEN _created THEN 'ONBOARDING_POINT_CREATED' ELSE 'ONBOARDING_POINT_UPDATED' END,'evaluation_point',_point_id,'{}');
 IF _created THEN INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_QR_GENERATED','evaluation_point',_point_id,jsonb_build_object('method','link_qr_nfc')); END IF;
 RETURN jsonb_build_object('id',_point_id,'code',_code);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) TO service_role;