CREATE OR REPLACE FUNCTION cartoquali_private.save_onboarding_point(_cartorio_id uuid,_name text,_location text,_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','extensions','cartoquali_private','pg_temp' AS $$
DECLARE v_caller uuid; v_survey_id uuid; v_point_id uuid; v_code text; v_attempt int:=0; v_created boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT u.id INTO v_caller FROM public.usuarios u WHERE u.auth_user_id=auth.uid() AND u.status='ativo';
 SELECT o.survey_id,o.point_id INTO v_survey_id,v_point_id FROM public.cartorio_onboarding o WHERE o.cartorio_id=$1;
 IF v_survey_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.pesquisas p WHERE p.id=v_survey_id AND p.cartorio_id=$1 AND p.status='ativa') THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE='22023'; END IF;
 IF nullif(btrim($2),'') IS NULL OR nullif(btrim($3),'') IS NULL THEN RAISE EXCEPTION 'invalid_point' USING ERRCODE='22023'; END IF;
 IF v_point_id IS NULL THEN
  LOOP v_attempt:=v_attempt+1; v_code:='CQ-'||upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,10)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.pontos_avaliacao p WHERE lower(p.codigo)=lower(v_code) OR p.public_slug=lower(v_code)); IF v_attempt>5 THEN RAISE EXCEPTION 'code_generation_failed'; END IF; END LOOP;
  INSERT INTO public.pontos_avaliacao(cartorio_id,pesquisa_id,nome,localizacao,codigo,descricao,status,public_slug,metodo) VALUES($1,v_survey_id,btrim($2),btrim($3),v_code,nullif(btrim($4),''),'inativo',lower(v_code),'link_qr_nfc') RETURNING id INTO v_point_id; v_created:=true;
  UPDATE public.cartorio_onboarding o SET point_id=v_point_id,current_step=greatest(o.current_step,5) WHERE o.cartorio_id=$1;
 ELSE UPDATE public.pontos_avaliacao p SET nome=btrim($2),localizacao=btrim($3),descricao=nullif(btrim($4),''),updated_at=now() WHERE p.id=v_point_id AND p.cartorio_id=$1 RETURNING p.codigo INTO v_code; END IF;
 PERFORM cartoquali_private.onboarding_audit($1,v_caller,CASE WHEN v_created THEN 'ONBOARDING_POINT_CREATED' ELSE 'ONBOARDING_POINT_UPDATED' END,'evaluation_point',v_point_id,'{}');
 IF v_created THEN PERFORM cartoquali_private.onboarding_audit($1,v_caller,'ONBOARDING_QR_GENERATED','evaluation_point',v_point_id,jsonb_build_object('method','link_qr_nfc')); END IF;
 RETURN jsonb_build_object('id',v_point_id,'code',v_code);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION cartoquali_private.save_onboarding_point(uuid,text,text,text) TO authenticated,service_role;