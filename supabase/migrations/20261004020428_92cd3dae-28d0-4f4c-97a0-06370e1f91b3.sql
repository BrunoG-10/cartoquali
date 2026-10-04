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
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,NULL,'CARTORIO_CREATED','registry',_cartorio_id,jsonb_build_object('environment','real','platform_actor_id',_caller));
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,NULL,'ONBOARDING_STARTED','onboarding',_onboarding_id,jsonb_build_object('source','platform_admin','platform_actor_id',_caller));
 RETURN jsonb_build_object('id',_cartorio_id,'onboardingId',_onboarding_id,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION cartoquali_private.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION cartoquali_private.audit_onboarding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE _actor uuid;
BEGIN
 _actor:=cartoquali_private.current_user_id();
 IF NOT EXISTS(SELECT 1 FROM public.usuarios WHERE id=_actor AND cartorio_id=NEW.cartorio_id) THEN _actor:=NULL; END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(NEW.cartorio_id,_actor,'ONBOARDING_PROGRESS_UPDATED','onboarding',NEW.id,jsonb_build_object('status',NEW.status,'current_step',NEW.current_step)); RETURN NEW;
END $$;