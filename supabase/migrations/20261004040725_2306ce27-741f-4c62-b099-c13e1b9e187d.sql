CREATE OR REPLACE FUNCTION cartoquali_private.save_onboarding_point(_cartorio_id uuid,_name text,_location text,_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','extensions','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _survey_id uuid; _point_id uuid; _code text; _attempt int:=0; _created boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT u.id INTO _caller FROM public.usuarios u WHERE u.auth_user_id=auth.uid() AND u.status='ativo';
 SELECT o.survey_id,o.point_id INTO _survey_id,_point_id FROM public.cartorio_onboarding o WHERE o.cartorio_id=_cartorio_id;
 IF _survey_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.pesquisas p WHERE p.id=_survey_id AND p.cartorio_id=_cartorio_id AND p.status='ativa') THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(_name),'') IS NULL OR nullif(btrim(_location),'') IS NULL THEN RAISE EXCEPTION 'invalid_point' USING ERRCODE='22023'; END IF;
 IF _point_id IS NULL THEN
  LOOP _attempt:=_attempt+1; _code:='CQ-'||upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,10)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.pontos_avaliacao p WHERE lower(p.codigo)=lower(_code) OR p.public_slug=lower(_code)); IF _attempt>5 THEN RAISE EXCEPTION 'code_generation_failed'; END IF; END LOOP;
  INSERT INTO public.pontos_avaliacao(cartorio_id,pesquisa_id,nome,localizacao,codigo,descricao,status,public_slug,metodo) VALUES(_cartorio_id,_survey_id,btrim(_name),btrim(_location),_code,nullif(btrim(_description),''),'inativo',lower(_code),'link_qr_nfc') RETURNING id INTO _point_id; _created:=true;
  UPDATE public.cartorio_onboarding o SET point_id=_point_id,current_step=greatest(o.current_step,5) WHERE o.cartorio_id=_cartorio_id;
 ELSE UPDATE public.pontos_avaliacao p SET nome=btrim(_name),localizacao=btrim(_location),descricao=nullif(btrim(_description),''),updated_at=now() WHERE p.id=_point_id AND p.cartorio_id=_cartorio_id RETURNING p.codigo INTO _code; END IF;
 PERFORM cartoquali_private.onboarding_audit(_cartorio_id,_caller,CASE WHEN _created THEN 'ONBOARDING_POINT_CREATED' ELSE 'ONBOARDING_POINT_UPDATED' END,'evaluation_point',_point_id,'{}');
 IF _created THEN PERFORM cartoquali_private.onboarding_audit(_cartorio_id,_caller,'ONBOARDING_QR_GENERATED','evaluation_point',_point_id,jsonb_build_object('method','link_qr_nfc')); END IF;
 RETURN jsonb_build_object('id',_point_id,'code',_code);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) TO authenticated,service_role;