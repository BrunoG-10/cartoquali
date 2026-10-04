CREATE OR REPLACE FUNCTION public.get_onboarding_test_context(_code text,_test_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _point public.pontos_avaliacao%rowtype; _registry public.cartorios%rowtype; _survey public.pesquisas%rowtype; _settings public.configuracoes_cartorio%rowtype; _questions jsonb;
BEGIN
 IF _code IS NULL OR length(trim(_code))<3 OR length(trim(_code))>80 OR _test_token IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
 SELECT p.* INTO _point FROM public.pontos_avaliacao p JOIN public.cartorio_onboarding o ON o.point_id=p.id WHERE (p.public_slug=lower(trim(_code)) OR lower(p.codigo)=lower(trim(_code))) AND o.status='READY_FOR_TEST' AND o.blocked_reason=_test_token::text LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
 SELECT * INTO _registry FROM public.cartorios WHERE id=_point.cartorio_id;
 SELECT * INTO _survey FROM public.pesquisas WHERE id=_point.pesquisa_id AND cartorio_id=_point.cartorio_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','unavailable'); END IF;
 SELECT * INTO _settings FROM public.configuracoes_cartorio WHERE cartorio_id=_point.cartorio_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('key',q.id,'text',q.texto,'type',q.tipo,'order',q.ordem,'required',q.obrigatoria,'dimension',q.dimensao,'condition',q.condicao,'options',coalesce((SELECT jsonb_agg(jsonb_build_object('value',x.valor,'label',x.texto) ORDER BY x.ordem) FROM public.opcoes_resposta x WHERE x.pergunta_id=q.id),'[]'::jsonb)) ORDER BY q.ordem),'[]'::jsonb) INTO _questions FROM public.perguntas q WHERE q.pesquisa_id=_survey.id AND q.ativa;
 IF jsonb_array_length(_questions)=0 THEN RETURN jsonb_build_object('status','unavailable'); END IF;
 RETURN jsonb_build_object('status','ready','registryName',_registry.nome_fantasia||' · TESTE','pointName',_point.nome,'surveyName',_survey.nome,'surveyDescription',_survey.descricao,'settings',jsonb_build_object('allowContactRequest',false,'thankYouMessage','Teste concluído. Retorne à implantação para revisar e ativar.','privacyNoticeVersion',coalesce(_settings.privacy_notice_version,'1.0')),'questions',_questions);
END $$;
REVOKE ALL ON FUNCTION public.get_onboarding_test_context(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_test_context(text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION cartoquali_private.prepare_onboarding_test(_cartorio_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _caller uuid; _point_id uuid; _survey_id uuid; _code text; _token uuid:=gen_random_uuid();
BEGIN
 IF auth.uid() IS NULL OR NOT cartoquali_private.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO _caller FROM public.usuarios WHERE auth_user_id=auth.uid() AND status='ativo';
 SELECT point_id,survey_id INTO _point_id,_survey_id FROM public.cartorio_onboarding WHERE cartorio_id=_cartorio_id FOR UPDATE;
 SELECT codigo INTO _code FROM public.pontos_avaliacao WHERE id=_point_id AND cartorio_id=_cartorio_id AND pesquisa_id=_survey_id;
 IF _code IS NULL OR NOT EXISTS(SELECT 1 FROM public.pesquisas s WHERE s.id=_survey_id AND s.cartorio_id=_cartorio_id AND EXISTS(SELECT 1 FROM public.perguntas q WHERE q.pesquisa_id=s.id AND q.ativa)) THEN RAISE EXCEPTION 'incomplete_onboarding' USING ERRCODE='22023'; END IF;
 UPDATE public.cartorios SET status='inativo',updated_at=now() WHERE id=_cartorio_id;
 UPDATE public.pontos_avaliacao SET status='inativo',updated_at=now() WHERE id=_point_id;
 UPDATE public.cartorio_onboarding SET status='READY_FOR_TEST',current_step=6,blocked_reason=_token::text WHERE cartorio_id=_cartorio_id;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_caller,'ONBOARDING_TEST_PREPARED','onboarding',_point_id,'{}');
 RETURN jsonb_build_object('code',_code,'testToken',_token);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.prepare_onboarding_test(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_onboarding_test_evaluation(_code text,_test_token uuid,_idempotency_key uuid,_source_hash text,_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _o public.cartorio_onboarding%rowtype; _point public.pontos_avaliacao%rowtype; _survey public.pesquisas%rowtype; _q public.perguntas%rowtype; _answer jsonb; _answer_text text; _evaluation_id uuid:=gen_random_uuid(); _rating smallint; _resolution text; _comment text; _improvements text; _condition_source text; _condition_operator text; _condition_value jsonb; _condition_answer jsonb; _visible boolean;
BEGIN
 IF _code IS NULL OR length(trim(_code))<3 OR length(trim(_code))>80 OR _test_token IS NULL OR _idempotency_key IS NULL OR _source_hash IS NULL OR length(_source_hash)<>64 OR _answers IS NULL OR jsonb_typeof(_answers)<>'object' OR jsonb_object_length(_answers)>50 OR pg_column_size(_answers)>32768 THEN RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM cartoquali_private.public_submission_guards WHERE idempotency_key=_idempotency_key) THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 IF (SELECT count(*) FROM cartoquali_private.public_submission_guards WHERE source_hash=_source_hash AND created_at>now()-interval '10 minutes')>=8 THEN RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0001'; END IF;
 SELECT p.* INTO _point FROM public.pontos_avaliacao p WHERE p.public_slug=lower(trim(_code)) OR lower(p.codigo)=lower(trim(_code)) ORDER BY CASE WHEN lower(p.codigo)=lower(trim(_code)) THEN 0 ELSE 1 END LIMIT 1;
 SELECT * INTO _o FROM public.cartorio_onboarding WHERE point_id=_point.id AND cartorio_id=_point.cartorio_id AND status='READY_FOR_TEST' AND blocked_reason=_test_token::text FOR UPDATE;
 IF _o.id IS NULL THEN RAISE EXCEPTION 'invalid_test' USING ERRCODE='42501'; END IF;
 SELECT * INTO _survey FROM public.pesquisas WHERE id=_point.pesquisa_id AND cartorio_id=_point.cartorio_id;
 IF _survey.id IS NULL THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE='P0001'; END IF;
 FOR _q IN SELECT * FROM public.perguntas WHERE pesquisa_id=_survey.id AND ativa ORDER BY ordem LOOP
  _answer:=_answers->_q.id::text; _visible:=true;
  IF _q.condicao IS NOT NULL THEN _condition_source:=coalesce(_q.condicao->>'sourceQuestionId',_q.condicao->>'source_question_id');_condition_operator:=coalesce(_q.condicao->>'operator','eq');_condition_value:=_q.condicao->'value';_condition_answer:=_answers->_condition_source;IF _condition_operator='lte' THEN _visible:=jsonb_typeof(_condition_answer)='number' AND (_condition_answer#>>'{}')::numeric<=(_condition_value#>>'{}')::numeric;ELSE _visible:=_condition_answer=_condition_value OR (_condition_answer#>>'{}')=(_condition_value#>>'{}');END IF; END IF;
  IF _visible AND _q.obrigatoria AND (_answer IS NULL OR _answer IN ('null'::jsonb,'""'::jsonb,'[]'::jsonb)) THEN RAISE EXCEPTION 'required_answer_missing' USING ERRCODE='22023'; END IF;
  IF NOT _visible OR _answer IS NULL OR _answer IN ('null'::jsonb,'""'::jsonb,'[]'::jsonb) THEN CONTINUE; END IF;
  IF _q.tipo IN ('stars','scale') THEN IF jsonb_typeof(_answer)<>'number' OR (_answer#>>'{}')::numeric NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE='22023'; END IF; IF _q.dimensao='overall' AND _rating IS NULL THEN _rating:=(_answer#>>'{}')::smallint; END IF;
  ELSIF _q.tipo='yes_no' THEN IF NOT EXISTS(SELECT 1 FROM public.opcoes_resposta x WHERE x.pergunta_id=_q.id AND (to_jsonb(x.valor)=_answer OR to_jsonb(x.texto)=_answer)) AND (_answer#>>'{}') NOT IN ('Sim','Não','sim','nao','não','Parcialmente','parcialmente') THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE='22023'; END IF;
  ELSIF _q.tipo='single_choice' THEN IF jsonb_typeof(_answer)<>'string' OR NOT EXISTS(SELECT 1 FROM public.opcoes_resposta x WHERE x.pergunta_id=_q.id AND (to_jsonb(x.valor)=_answer OR to_jsonb(x.texto)=_answer)) THEN RAISE EXCEPTION 'invalid_option' USING ERRCODE='22023'; END IF;
  ELSIF _q.tipo='multiple_choice' THEN IF jsonb_typeof(_answer)<>'array' OR jsonb_array_length(_answer)>20 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(_answer) v WHERE length(v.value)>200 OR NOT EXISTS(SELECT 1 FROM public.opcoes_resposta x WHERE x.pergunta_id=_q.id AND (x.valor=v.value OR x.texto=v.value))) THEN RAISE EXCEPTION 'invalid_option' USING ERRCODE='22023'; END IF;
  ELSIF _q.tipo='text' THEN IF jsonb_typeof(_answer)<>'string' OR length(_answer#>>'{}')>1000 THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE='22023'; END IF;
  ELSE RAISE EXCEPTION 'invalid_question_type' USING ERRCODE='22023'; END IF;
  _answer_text:=CASE WHEN jsonb_typeof(_answer)='string' THEN _answer#>>'{}' ELSE NULL END;
  IF _q.dimensao='resolution' THEN _resolution:=CASE lower(coalesce(_answer_text,'')) WHEN 'sim' THEN 'sim' WHEN 'parcialmente' THEN 'parcialmente' WHEN 'não' THEN 'nao' WHEN 'nao' THEN 'nao' ELSE NULL END; END IF;
  IF _q.tipo='text' AND _q.dimensao='comment' THEN _comment:=nullif(trim(_answer_text),''); END IF;
  IF _q.tipo='multiple_choice' AND _q.dimensao='comment' THEN _improvements:=array_to_string(ARRAY(SELECT jsonb_array_elements_text(_answer)),', '); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_answers) supplied(key) WHERE NOT EXISTS(SELECT 1 FROM public.perguntas q WHERE q.id::text=supplied.key AND q.pesquisa_id=_survey.id AND q.ativa)) THEN RAISE EXCEPTION 'unknown_question' USING ERRCODE='22023'; END IF;
 IF _rating IS NULL THEN SELECT (_answers->q.id::text#>>'{}')::smallint INTO _rating FROM public.perguntas q WHERE q.pesquisa_id=_survey.id AND q.ativa AND q.tipo IN ('stars','scale') AND _answers?q.id::text ORDER BY q.ordem LIMIT 1; END IF;
 IF _rating IS NULL OR _rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'rating_required' USING ERRCODE='22023'; END IF;
 INSERT INTO cartoquali_private.public_submission_guards(idempotency_key,source_hash) VALUES(_idempotency_key,_source_hash);
 INSERT INTO public.avaliacoes(id,cartorio_id,ponto_id,pesquisa_id,nota_geral,atendimento_resolvido,comentario,motivo_insatisfacao,deseja_contato,anonymous,status,is_test) VALUES(_evaluation_id,_point.cartorio_id,_point.id,_survey.id,_rating,_resolution,_comment,_improvements,false,true,'nova',true);
 INSERT INTO public.respostas(avaliacao_id,pergunta_id,valor,resposta_texto) SELECT _evaluation_id,q.id,_answers->q.id::text,CASE WHEN jsonb_typeof(_answers->q.id::text)='string' THEN _answers->q.id::text#>>'{}' ELSE NULL END FROM public.perguntas q WHERE q.pesquisa_id=_survey.id AND q.ativa AND _answers?q.id::text AND _answers->q.id::text NOT IN ('null'::jsonb,'""'::jsonb,'[]'::jsonb);
 UPDATE public.cartorio_onboarding SET test_evaluation_id=_evaluation_id,current_step=7,blocked_reason=NULL WHERE id=_o.id;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_point.cartorio_id,NULL,'ONBOARDING_TEST_COMPLETED','evaluation',_evaluation_id,jsonb_build_object('is_test',true));
 RETURN jsonb_build_object('ok',true,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.submit_onboarding_test_evaluation(text,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_onboarding_test_evaluation(text,uuid,uuid,text,jsonb) TO service_role;