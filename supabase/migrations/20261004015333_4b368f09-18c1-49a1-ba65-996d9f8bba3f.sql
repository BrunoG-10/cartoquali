ALTER TABLE public.avaliacoes ADD COLUMN is_test boolean NOT NULL DEFAULT false;
CREATE INDEX avaliacoes_real_metrics_idx ON public.avaliacoes(cartorio_id, created_at DESC) WHERE is_test = false;

CREATE TABLE public.cartorio_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cartorio_id uuid NOT NULL UNIQUE REFERENCES public.cartorios(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','READY_FOR_TEST','ACTIVE','BLOCKED')),
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  survey_id uuid,
  point_id uuid,
  test_evaluation_id uuid,
  client_request_id uuid NOT NULL UNIQUE,
  blocked_reason text,
  created_by_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  CONSTRAINT cartorio_onboarding_survey_tenant_fkey FOREIGN KEY (survey_id, cartorio_id) REFERENCES public.pesquisas(id, cartorio_id) ON DELETE RESTRICT,
  CONSTRAINT cartorio_onboarding_point_tenant_fkey FOREIGN KEY (point_id, cartorio_id) REFERENCES public.pontos_avaliacao(id, cartorio_id) ON DELETE RESTRICT,
  CONSTRAINT cartorio_onboarding_test_tenant_fkey FOREIGN KEY (test_evaluation_id, cartorio_id) REFERENCES public.avaliacoes(id, cartorio_id) ON DELETE RESTRICT
);
GRANT SELECT ON public.cartorio_onboarding TO authenticated;
GRANT ALL ON public.cartorio_onboarding TO service_role;
ALTER TABLE public.cartorio_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_select_authorized ON public.cartorio_onboarding FOR SELECT TO authenticated USING (
  cartorio_id = cartoquali_private.current_cartorio_id()
  OR cartoquali_private.has_any_role(ARRAY['PLATFORM_ADMIN'::text])
);

CREATE OR REPLACE FUNCTION cartoquali_private.touch_onboarding_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER touch_cartorio_onboarding BEFORE UPDATE ON public.cartorio_onboarding FOR EACH ROW EXECUTE FUNCTION cartoquali_private.touch_onboarding_updated_at();

CREATE OR REPLACE FUNCTION cartoquali_private.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    JOIN public.user_roles r ON r.user_id=u.id
    WHERE u.auth_user_id=(SELECT auth.uid()) AND u.status='ativo' AND r.role='PLATFORM_ADMIN'
  )
$$;
REVOKE ALL ON FUNCTION cartoquali_private.is_platform_admin() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.is_platform_admin() TO service_role;

CREATE OR REPLACE FUNCTION public.get_onboarding_checklist(_cartorio_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _o public.cartorio_onboarding%rowtype; _c public.cartorios%rowtype; _result jsonb; _admin boolean; _survey boolean; _questions boolean; _point boolean; _test boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  IF NOT cartoquali_private.is_platform_admin() AND _cartorio_id IS DISTINCT FROM cartoquali_private.current_cartorio_id() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO _o FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id;
  SELECT * INTO _c FROM public.cartorios WHERE id=_cartorio_id;
  IF NOT FOUND OR _o.id IS NULL THEN RAISE EXCEPTION 'onboarding_not_found' USING ERRCODE='P0002'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.usuarios u JOIN public.user_roles r ON r.user_id=u.id WHERE u.cartorio_id=_cartorio_id AND u.status='ativo' AND r.role='CARTORIO_ADMIN') INTO _admin;
  SELECT EXISTS(SELECT 1 FROM public.pesquisas s WHERE s.id=_o.survey_id AND s.cartorio_id=_cartorio_id AND s.status IN ('rascunho','ativa')) INTO _survey;
  SELECT _survey AND EXISTS(SELECT 1 FROM public.perguntas q WHERE q.pesquisa_id=_o.survey_id AND q.ativa) AND NOT EXISTS(SELECT 1 FROM public.perguntas q WHERE q.pesquisa_id=_o.survey_id AND q.ativa AND q.tipo IN ('yes_no','single_choice','multiple_choice') AND NOT EXISTS(SELECT 1 FROM public.opcoes_resposta x WHERE x.pergunta_id=q.id)) INTO _questions;
  SELECT EXISTS(SELECT 1 FROM public.pontos_avaliacao p WHERE p.id=_o.point_id AND p.cartorio_id=_cartorio_id AND p.pesquisa_id=_o.survey_id AND p.public_slug IS NOT NULL) INTO _point;
  SELECT EXISTS(SELECT 1 FROM public.avaliacoes a WHERE a.id=_o.test_evaluation_id AND a.cartorio_id=_cartorio_id AND a.is_test) INTO _test;
  _result:=jsonb_build_object('registry',(_c.id IS NOT NULL AND btrim(_c.nome_fantasia)<>'' AND btrim(_c.cnpj)<>'' AND btrim(_c.cidade)<>'' AND length(_c.estado)=2),'administrator',_admin,'survey',_survey,'questions',_questions,'point',_point,'qr',_point,'test',_test);
  RETURN _result || jsonb_build_object('complete',coalesce((_result->>'registry')::boolean,false) AND _admin AND _survey AND _questions AND _point AND _test);
END $$;
REVOKE ALL ON FUNCTION public.get_onboarding_checklist(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_checklist(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_cartorio_onboarding(
  _client_request_id uuid,_razao_social text,_nome_fantasia text,_cnpj text,_tipo text,_cidade text,_estado text,_responsavel text,_email text DEFAULT NULL,_telefone text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _cartorio_id uuid; _onboarding_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
  IF _client_request_id IS NULL OR nullif(btrim(_razao_social),'') IS NULL OR nullif(btrim(_nome_fantasia),'') IS NULL OR nullif(regexp_replace(_cnpj,'[^0-9]','','g'),'') IS NULL OR nullif(btrim(_tipo),'') IS NULL OR nullif(btrim(_cidade),'') IS NULL OR length(upper(btrim(_estado)))<>2 OR nullif(btrim(_responsavel),'') IS NULL THEN RAISE EXCEPTION 'invalid_registry' USING ERRCODE='22023'; END IF;
  SELECT cartorio_id INTO _cartorio_id FROM public.cartorio_onboarding WHERE client_request_id=_client_request_id;
  IF _cartorio_id IS NOT NULL THEN RETURN jsonb_build_object('id',_cartorio_id,'duplicate',true); END IF;
  IF EXISTS(SELECT 1 FROM public.cartorios WHERE regexp_replace(cnpj,'[^0-9]','','g')=regexp_replace(_cnpj,'[^0-9]','','g')) THEN RAISE EXCEPTION 'duplicate_registry' USING ERRCODE='23505'; END IF;
  INSERT INTO public.cartorios(razao_social,nome_fantasia,cnpj,tipo,telefone,email,cidade,estado,responsavel,status,plano)
  VALUES(btrim(_razao_social),btrim(_nome_fantasia),regexp_replace(_cnpj,'[^0-9]','','g'),btrim(_tipo),nullif(btrim(_telefone),''),nullif(lower(btrim(_email)),''),btrim(_cidade),upper(btrim(_estado)),btrim(_responsavel),'inativo','Implantação') RETURNING id INTO _cartorio_id;
  INSERT INTO public.configuracoes_cartorio(cartorio_id,nome_exibicao) VALUES(_cartorio_id,btrim(_nome_fantasia));
  INSERT INTO public.cartorio_onboarding(cartorio_id,client_request_id,created_by_id) VALUES(_cartorio_id,_client_request_id,_caller) RETURNING id INTO _onboarding_id;
  INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_STARTED','onboarding',_onboarding_id,jsonb_build_object('source','platform_admin'));
  RETURN jsonb_build_object('id',_cartorio_id,'onboardingId',_onboarding_id,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_cartorio_onboarding(uuid,text,text,text,text,text,text,text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_onboarding_administrator(_cartorio_id uuid,_auth_user_id uuid,_name text,_email text,_phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
  IF NOT EXISTS(SELECT 1 FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id AND status<>'ACTIVE') THEN RAISE EXCEPTION 'onboarding_not_found' USING ERRCODE='P0002'; END IF;
  IF _auth_user_id IS NULL OR nullif(btrim(_name),'') IS NULL OR _email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN RAISE EXCEPTION 'invalid_administrator' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.usuarios WHERE lower(email)=lower(btrim(_email)) OR auth_user_id=_auth_user_id) THEN RAISE EXCEPTION 'duplicate_user' USING ERRCODE='23505'; END IF;
  INSERT INTO public.usuarios(cartorio_id,auth_user_id,nome,email,telefone,status) VALUES(_cartorio_id,_auth_user_id,btrim(_name),lower(btrim(_email)),nullif(btrim(_phone),''),'ativo') RETURNING id INTO _id;
  INSERT INTO public.user_roles(user_id,role) VALUES(_id,'CARTORIO_ADMIN');
  UPDATE public.cartorio_onboarding SET current_step=greatest(current_step,3) WHERE cartorio_id=_cartorio_id;
  INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_ADMIN_CREATED','user',_id,jsonb_build_object('role','CARTORIO_ADMIN'));
  RETURN jsonb_build_object('id',_id);
END $$;
REVOKE ALL ON FUNCTION public.create_onboarding_administrator(uuid,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_onboarding_administrator(uuid,uuid,text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.save_onboarding_survey(_cartorio_id uuid,_name text,_description text,_use_template boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _survey_id uuid; _question_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
  SELECT survey_id INTO _survey_id FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id;
  IF _survey_id IS NULL THEN
    INSERT INTO public.pesquisas(cartorio_id,nome,descricao,status,versao,configuracoes) VALUES(_cartorio_id,btrim(_name),nullif(btrim(_description),''),'rascunho','1.0','{}') RETURNING id INTO _survey_id;
    UPDATE public.cartorio_onboarding SET survey_id=_survey_id,current_step=greatest(current_step,3) WHERE cartorio_id=_cartorio_id;
    IF _use_template THEN
      INSERT INTO public.perguntas(pesquisa_id,texto,tipo,ordem,obrigatoria,ativa,dimensao) VALUES(_survey_id,'Como você avalia o atendimento?','stars',1,true,true,'overall') RETURNING id INTO _question_id;
      INSERT INTO public.perguntas(pesquisa_id,texto,tipo,ordem,obrigatoria,ativa,dimensao) VALUES(_survey_id,'Seu atendimento foi resolvido?','yes_no',2,true,true,'resolution') RETURNING id INTO _question_id;
      INSERT INTO public.opcoes_resposta(pergunta_id,texto,valor,ordem) VALUES(_question_id,'Sim','sim',1),(_question_id,'Parcialmente','parcialmente',2),(_question_id,'Não','nao',3);
      INSERT INTO public.perguntas(pesquisa_id,texto,tipo,ordem,obrigatoria,ativa,dimensao) VALUES
        (_survey_id,'Como avalia o tempo de atendimento?','stars',3,true,true,'time'),
        (_survey_id,'Como avalia a clareza das informações?','stars',4,true,true,'clarity'),
        (_survey_id,'Como avalia a estrutura do local?','stars',5,false,true,'structure'),
        (_survey_id,'O que poderia ser melhor?','text',6,false,true,'comment');
    END IF;
  ELSE UPDATE public.pesquisas SET nome=btrim(_name),descricao=nullif(btrim(_description),''),updated_at=now() WHERE id=_survey_id AND cartorio_id=_cartorio_id;
  END IF;
  INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_SURVEY_SAVED','survey',_survey_id,'{}');
  RETURN jsonb_build_object('id',_survey_id);
END $$;
REVOKE ALL ON FUNCTION public.save_onboarding_survey(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_onboarding_survey(uuid,text,text,boolean) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.publish_onboarding_survey(_cartorio_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _survey_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 SELECT survey_id INTO _survey_id FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id;
 IF _survey_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.perguntas q WHERE q.pesquisa_id=_survey_id AND q.ativa AND q.obrigatoria) OR EXISTS(SELECT 1 FROM public.perguntas q WHERE q.pesquisa_id=_survey_id AND q.ativa AND q.tipo IN ('yes_no','single_choice','multiple_choice') AND NOT EXISTS(SELECT 1 FROM public.opcoes_resposta o WHERE o.pergunta_id=q.id)) THEN RAISE EXCEPTION 'incomplete_survey' USING ERRCODE='22023'; END IF;
 UPDATE public.pesquisas SET status='ativa',updated_at=now() WHERE id=_survey_id AND cartorio_id=_cartorio_id;
 UPDATE public.cartorio_onboarding SET current_step=greatest(current_step,4) WHERE cartorio_id=_cartorio_id;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_SURVEY_PUBLISHED','survey',_survey_id,'{}');
 RETURN jsonb_build_object('id',_survey_id);
END $$;
REVOKE ALL ON FUNCTION public.publish_onboarding_survey(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_onboarding_survey(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.save_onboarding_point(_cartorio_id uuid,_name text,_location text,_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _survey_id uuid; _point_id uuid; _code text; _attempt int:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 SELECT survey_id,point_id INTO _survey_id,_point_id FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id;
 IF _survey_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.pesquisas WHERE id=_survey_id AND cartorio_id=_cartorio_id AND status='ativa') THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(_name),'') IS NULL OR nullif(btrim(_location),'') IS NULL THEN RAISE EXCEPTION 'invalid_point' USING ERRCODE='22023'; END IF;
 IF _point_id IS NULL THEN
  LOOP _attempt:=_attempt+1; _code:='CQ-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.pontos_avaliacao WHERE lower(codigo)=lower(_code) OR public_slug=lower(_code)); IF _attempt>5 THEN RAISE EXCEPTION 'code_generation_failed'; END IF; END LOOP;
  INSERT INTO public.pontos_avaliacao(cartorio_id,pesquisa_id,nome,localizacao,codigo,descricao,status,public_slug,metodo) VALUES(_cartorio_id,_survey_id,btrim(_name),btrim(_location),_code,nullif(btrim(_description),''),'inativo',lower(_code),'link_qr_nfc') RETURNING id INTO _point_id;
  UPDATE public.cartorio_onboarding SET point_id=_point_id,current_step=greatest(current_step,5) WHERE cartorio_id=_cartorio_id;
 ELSE UPDATE public.pontos_avaliacao SET nome=btrim(_name),localizacao=btrim(_location),descricao=nullif(btrim(_description),''),updated_at=now() WHERE id=_point_id AND cartorio_id=_cartorio_id RETURNING codigo INTO _code;
 END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_POINT_SAVED','evaluation_point',_point_id,jsonb_build_object('code',_code));
 RETURN jsonb_build_object('id',_point_id,'code',_code);
END $$;
REVOKE ALL ON FUNCTION public.save_onboarding_point(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_onboarding_point(uuid,text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.prepare_onboarding_test(_cartorio_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _point_id uuid; _code text; _token uuid:=gen_random_uuid();
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 SELECT point_id INTO _point_id FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id;
 SELECT codigo INTO _code FROM public.pontos_avaliacao WHERE id=_point_id AND cartorio_id=_cartorio_id;
 IF _code IS NULL THEN RAISE EXCEPTION 'point_required' USING ERRCODE='22023'; END IF;
 UPDATE public.pontos_avaliacao SET status='ativo' WHERE id=_point_id;
 UPDATE public.cartorios SET status='ativo' WHERE id=_cartorio_id;
 UPDATE public.cartorio_onboarding SET status='READY_FOR_TEST',current_step=6,blocked_reason=_token::text WHERE cartorio_id=_cartorio_id;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_TEST_PREPARED','onboarding',_point_id,'{}');
 RETURN jsonb_build_object('code',_code,'testToken',_token);
END $$;
REVOKE ALL ON FUNCTION public.prepare_onboarding_test(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_onboarding_test(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.submit_onboarding_test_evaluation(_code text,_test_token uuid,_idempotency_key uuid,_source_hash text,_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _o public.cartorio_onboarding%rowtype; _point public.pontos_avaliacao%rowtype; _survey public.pesquisas%rowtype; _q public.perguntas%rowtype; _answer jsonb; _evaluation_id uuid:=gen_random_uuid(); _rating smallint;
BEGIN
 SELECT * INTO _point FROM public.pontos_avaliacao WHERE lower(codigo)=lower(trim(_code)) OR public_slug=lower(trim(_code)) LIMIT 1;
 SELECT * INTO _o FROM public.cartorio_onboarding WHERE point_id=_point.id AND status='READY_FOR_TEST' AND blocked_reason=_test_token::text;
 IF _o.id IS NULL THEN RAISE EXCEPTION 'invalid_test' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM cartoquali_private.public_submission_guards WHERE idempotency_key=_idempotency_key) THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 IF (SELECT count(*) FROM cartoquali_private.public_submission_guards WHERE source_hash=_source_hash AND created_at>now()-interval '10 minutes')>=8 THEN RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0001'; END IF;
 SELECT * INTO _survey FROM public.pesquisas WHERE id=_point.pesquisa_id AND status='ativa';
 FOR _q IN SELECT * FROM public.perguntas WHERE pesquisa_id=_survey.id AND ativa ORDER BY ordem LOOP
   _answer:=_answers->_q.id::text;
   IF _q.obrigatoria AND (_answer IS NULL OR _answer IN ('null'::jsonb,'""'::jsonb,'[]'::jsonb)) THEN RAISE EXCEPTION 'required_answer_missing' USING ERRCODE='22023'; END IF;
   IF _q.tipo IN ('stars','scale') AND _answer IS NOT NULL THEN IF jsonb_typeof(_answer)<>'number' OR (_answer#>>'{}')::numeric NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE='22023'; END IF; IF _rating IS NULL THEN _rating:=(_answer#>>'{}')::smallint; END IF; END IF;
 END LOOP;
 IF _rating IS NULL THEN RAISE EXCEPTION 'rating_required' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_answers) supplied(key) WHERE NOT EXISTS(SELECT 1 FROM public.perguntas q WHERE q.id::text=supplied.key AND q.pesquisa_id=_survey.id AND q.ativa)) THEN RAISE EXCEPTION 'unknown_question' USING ERRCODE='22023'; END IF;
 INSERT INTO cartoquali_private.public_submission_guards(idempotency_key,source_hash) VALUES(_idempotency_key,_source_hash);
 INSERT INTO public.avaliacoes(id,cartorio_id,ponto_id,pesquisa_id,nota_geral,anonymous,status,is_test) VALUES(_evaluation_id,_point.cartorio_id,_point.id,_survey.id,_rating,true,'nova',true);
 INSERT INTO public.respostas(avaliacao_id,pergunta_id,valor,resposta_texto) SELECT _evaluation_id,q.id,_answers->q.id::text,CASE WHEN jsonb_typeof(_answers->q.id::text)='string' THEN _answers->q.id::text#>>'{}' ELSE NULL END FROM public.perguntas q WHERE q.pesquisa_id=_survey.id AND q.ativa AND _answers?q.id::text;
 UPDATE public.cartorio_onboarding SET test_evaluation_id=_evaluation_id,current_step=7,blocked_reason=NULL WHERE id=_o.id;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_point.cartorio_id,NULL,'ONBOARDING_TEST_COMPLETED','evaluation',_evaluation_id,jsonb_build_object('is_test',true));
 RETURN jsonb_build_object('ok',true,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.submit_onboarding_test_evaluation(text,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_onboarding_test_evaluation(text,uuid,uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.set_onboarding_operational_status(_cartorio_id uuid,_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _o public.cartorio_onboarding%rowtype; _check jsonb; _event text;
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 SELECT * INTO _o FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id FOR UPDATE;
 IF _o.id IS NULL THEN RAISE EXCEPTION 'onboarding_not_found' USING ERRCODE='P0002'; END IF;
 IF _action='activate' THEN
   SELECT public.get_onboarding_checklist(_cartorio_id) INTO _check;
   IF NOT coalesce((_check->>'complete')::boolean,false) THEN RAISE EXCEPTION 'incomplete_onboarding' USING ERRCODE='22023'; END IF;
   UPDATE public.cartorios SET status='ativo',updated_at=now() WHERE id=_cartorio_id;
   UPDATE public.pesquisas SET status='ativa',updated_at=now() WHERE id=_o.survey_id AND cartorio_id=_cartorio_id;
   UPDATE public.pontos_avaliacao SET status='ativo',updated_at=now() WHERE id=_o.point_id AND cartorio_id=_cartorio_id;
   UPDATE public.cartorio_onboarding SET status='ACTIVE',current_step=7,activated_at=coalesce(activated_at,now()),blocked_reason=NULL WHERE id=_o.id;
   _event:='CARTORIO_ACTIVATED';
 ELSIF _action='deactivate' THEN
   UPDATE public.cartorios SET status='inativo',updated_at=now() WHERE id=_cartorio_id;
   UPDATE public.cartorio_onboarding SET status='BLOCKED',blocked_reason='Desativado administrativamente' WHERE id=_o.id;
   _event:='CARTORIO_DEACTIVATED';
 ELSIF _action='reactivate' THEN
   IF _o.activated_at IS NULL THEN RAISE EXCEPTION 'never_activated' USING ERRCODE='22023'; END IF;
   UPDATE public.cartorios SET status='ativo',updated_at=now() WHERE id=_cartorio_id;
   UPDATE public.pesquisas SET status='ativa',updated_at=now() WHERE id=_o.survey_id;
   UPDATE public.pontos_avaliacao SET status='ativo',updated_at=now() WHERE id=_o.point_id;
   UPDATE public.cartorio_onboarding SET status='ACTIVE',blocked_reason=NULL WHERE id=_o.id;
   _event:='CARTORIO_REACTIVATED';
 ELSE RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,_event,'registry',_cartorio_id,'{}');
 RETURN jsonb_build_object('status',CASE WHEN _action='deactivate' THEN 'BLOCKED' ELSE 'ACTIVE' END);
END $$;
REVOKE ALL ON FUNCTION public.set_onboarding_operational_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_onboarding_operational_status(uuid,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION cartoquali_private.audit_onboarding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(NEW.cartorio_id,cartoquali_private.current_user_id(),'ONBOARDING_PROGRESS_UPDATED','onboarding',NEW.id,jsonb_build_object('status',NEW.status,'current_step',NEW.current_step)); RETURN NEW;
END $$;
CREATE TRIGGER audit_onboarding_progress AFTER UPDATE ON public.cartorio_onboarding FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.current_step IS DISTINCT FROM NEW.current_step) EXECUTE FUNCTION cartoquali_private.audit_onboarding();

CREATE OR REPLACE FUNCTION public.get_dashboard_indicators(_current_start timestamptz,_current_end timestamptz,_previous_start timestamptz,_previous_end timestamptz,_point_id uuid DEFAULT NULL,_survey_id uuid DEFAULT NULL,_granularity text DEFAULT 'day') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='public','pg_temp' AS $$
DECLARE _result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF _current_start IS NULL OR _current_end IS NULL OR _previous_start IS NULL OR _previous_end IS NULL OR _current_start>=_current_end OR _previous_start>=_previous_end OR _granularity NOT IN ('day','week','month') THEN RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023'; END IF;
 WITH current_evaluations AS (SELECT a.* FROM public.avaliacoes a WHERE NOT a.is_test AND a.created_at>=_current_start AND a.created_at<_current_end AND (_point_id IS NULL OR a.ponto_id=_point_id) AND (_survey_id IS NULL OR a.pesquisa_id=_survey_id)),previous_evaluations AS (SELECT a.* FROM public.avaliacoes a WHERE NOT a.is_test AND a.created_at>=_previous_start AND a.created_at<_previous_end AND (_point_id IS NULL OR a.ponto_id=_point_id) AND (_survey_id IS NULL OR a.pesquisa_id=_survey_id)),current_summary AS (SELECT count(*)::int total,round(avg(nota_geral)::numeric,2) average,round((count(*) filter(where nota_geral>=4)*100.0/nullif(count(*),0))::numeric,2) satisfaction,round((count(*) filter(where nota_geral<=3)*100.0/nullif(count(*),0))::numeric,2) negative_rate,count(*) filter(where nota_geral<=3)::int negative_count,count(*) filter(where comentario is not null and btrim(comentario)<>'')::int comments,count(*) filter(where deseja_contato)::int contact_requests,round((count(*) filter(where atendimento_resolvido='sim')*100.0/nullif(count(*) filter(where atendimento_resolvido is not null),0))::numeric,2) resolution FROM current_evaluations),previous_summary AS (SELECT count(*)::int total,round(avg(nota_geral)::numeric,2) average,round((count(*) filter(where nota_geral>=4)*100.0/nullif(count(*),0))::numeric,2) satisfaction,round((count(*) filter(where nota_geral<=3)*100.0/nullif(count(*),0))::numeric,2) negative_rate,count(*) filter(where nota_geral<=3)::int negative_count,count(*) filter(where comentario is not null and btrim(comentario)<>'')::int comments,count(*) filter(where deseja_contato)::int contact_requests,round((count(*) filter(where atendimento_resolvido='sim')*100.0/nullif(count(*) filter(where atendimento_resolvido is not null),0))::numeric,2) resolution FROM previous_evaluations),distribution AS (SELECT r.rating,count(c.id)::int count FROM generate_series(1,5) r(rating) LEFT JOIN current_evaluations c ON c.nota_geral=r.rating GROUP BY r.rating),series AS (SELECT date_trunc(_granularity,c.created_at at time zone 'America/Sao_Paulo') bucket,count(*)::int total,round(avg(c.nota_geral)::numeric,2) average,round((count(*) filter(where c.nota_geral>=4)*100.0/count(*))::numeric,2) satisfaction,round((count(*) filter(where c.nota_geral<=3)*100.0/count(*))::numeric,2) negative_rate,round((count(*) filter(where c.atendimento_resolvido='sim')*100.0/nullif(count(*) filter(where c.atendimento_resolvido is not null),0))::numeric,2) resolution FROM current_evaluations c GROUP BY 1),point_performance AS (SELECT p.id,p.nome name,count(c.id)::int total,round(avg(c.nota_geral)::numeric,2) average,round((count(c.id) filter(where c.nota_geral>=4)*100.0/nullif(count(c.id),0))::numeric,2) satisfaction,round((count(c.id) filter(where c.nota_geral<=3)*100.0/nullif(count(c.id),0))::numeric,2) negative_rate FROM public.pontos_avaliacao p LEFT JOIN current_evaluations c ON c.ponto_id=p.id WHERE (_point_id IS NULL OR p.id=_point_id) AND (_survey_id IS NULL OR p.pesquisa_id=_survey_id) GROUP BY p.id,p.nome),current_dimension_values AS (SELECT lower(q.dimensao) dimension,CASE WHEN q.tipo IN ('stars','scale') AND jsonb_typeof(r.valor)='number' THEN (r.valor#>>'{}')::numeric WHEN q.tipo='yes_no' AND lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) IN ('sim','yes','true') THEN 5 WHEN q.tipo='yes_no' AND lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) IN ('parcialmente','partial') THEN 3 WHEN q.tipo='yes_no' AND lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) IN ('não','nao','no','false') THEN 1 END score FROM public.respostas r JOIN current_evaluations e ON e.id=r.avaliacao_id JOIN public.perguntas q ON q.id=r.pergunta_id AND q.pesquisa_id=e.pesquisa_id WHERE q.dimensao IN ('service','time','clarity','resolution','structure')),previous_dimension_values AS (SELECT lower(q.dimensao) dimension,CASE WHEN q.tipo IN ('stars','scale') AND jsonb_typeof(r.valor)='number' THEN (r.valor#>>'{}')::numeric WHEN q.tipo='yes_no' AND lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) IN ('sim','yes','true') THEN 5 WHEN q.tipo='yes_no' AND lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) IN ('parcialmente','partial') THEN 3 WHEN q.tipo='yes_no' AND lower(coalesce(r.valor#>>'{}',r.resposta_texto,'')) IN ('não','nao','no','false') THEN 1 END score FROM public.respostas r JOIN previous_evaluations e ON e.id=r.avaliacao_id JOIN public.perguntas q ON q.id=r.pergunta_id AND q.pesquisa_id=e.pesquisa_id WHERE q.dimensao IN ('service','time','clarity','resolution','structure')),current_dimensions AS (SELECT dimension,count(score)::int responses,round((avg(score)/5*100)::numeric,2) index FROM current_dimension_values WHERE score BETWEEN 1 AND 5 GROUP BY dimension),previous_dimensions AS (SELECT dimension,count(score)::int responses,round((avg(score)/5*100)::numeric,2) index FROM previous_dimension_values WHERE score BETWEEN 1 AND 5 GROUP BY dimension),dimension_keys AS (SELECT * FROM (VALUES('service','Atendimento'),('time','Tempo'),('clarity','Clareza'),('resolution','Resolutividade'),('structure','Estrutura')) d(key,label)),dimensions AS (SELECT d.key,d.label,coalesce(c.responses,0) responses,c.index,coalesce(p.responses,0) previous_responses,p.index previous_index FROM dimension_keys d LEFT JOIN current_dimensions c ON c.dimension=d.key LEFT JOIN previous_dimensions p ON p.dimension=d.key),recent AS (SELECT c.id,c.nota_geral rating,c.comentario comment,c.created_at,p.nome point_name FROM current_evaluations c JOIN public.pontos_avaliacao p ON p.id=c.ponto_id ORDER BY c.created_at DESC LIMIT 3),filters AS (SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.nome) ORDER BY p.nome),'[]') FROM public.pontos_avaliacao p) points,(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome) ORDER BY s.nome),'[]') FROM public.pesquisas s) surveys) SELECT jsonb_build_object('summary',to_jsonb(cs),'previousSummary',to_jsonb(ps),'distribution',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.rating),'[]') FROM distribution d),'series',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.bucket),'[]') FROM series s),'points',(SELECT coalesce(jsonb_agg(to_jsonb(pp) ORDER BY pp.total desc,pp.name),'[]') FROM point_performance pp),'dimensions',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.key),'[]') FROM dimensions d),'recent',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at desc),'[]') FROM recent r),'filters',to_jsonb(f)) INTO _result FROM current_summary cs CROSS JOIN previous_summary ps CROSS JOIN filters f; RETURN _result;
END $$;
REVOKE ALL ON FUNCTION public.get_dashboard_indicators(timestamptz,timestamptz,timestamptz,timestamptz,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_indicators(timestamptz,timestamptz,timestamptz,timestamptz,uuid,uuid,text) TO authenticated,service_role;