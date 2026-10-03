CREATE TABLE cartoquali_private.public_submission_guards (
  idempotency_key uuid PRIMARY KEY,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX public_submission_guards_source_created_idx
  ON cartoquali_private.public_submission_guards (source_hash, created_at DESC);

REVOKE ALL ON cartoquali_private.public_submission_guards FROM PUBLIC, anon, authenticated;
GRANT ALL ON cartoquali_private.public_submission_guards TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_evaluation_context(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _point public.pontos_avaliacao%ROWTYPE;
  _registry public.cartorios%ROWTYPE;
  _survey public.pesquisas%ROWTYPE;
  _questions jsonb;
BEGIN
  IF _code IS NULL OR length(trim(_code)) < 3 OR length(trim(_code)) > 80 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT * INTO _point
  FROM public.pontos_avaliacao
  WHERE public_slug = lower(trim(_code))
  LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF _point.status <> 'ativo' THEN RETURN jsonb_build_object('status', 'inactive'); END IF;

  SELECT * INTO _registry FROM public.cartorios WHERE id = _point.cartorio_id;
  IF NOT FOUND OR _registry.status <> 'ativo' THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  SELECT * INTO _survey FROM public.pesquisas
  WHERE id = _point.pesquisa_id AND cartorio_id = _point.cartorio_id;
  IF NOT FOUND OR _survey.status <> 'ativa' THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'key', q.id,
    'text', q.texto,
    'type', q.tipo,
    'order', q.ordem,
    'required', q.obrigatoria,
    'dimension', q.dimensao,
    'condition', q.condicao,
    'options', coalesce((SELECT jsonb_agg(jsonb_build_object('value', o.valor, 'label', o.texto) ORDER BY o.ordem) FROM public.opcoes_resposta o WHERE o.pergunta_id = q.id), '[]'::jsonb)
  ) ORDER BY q.ordem), '[]'::jsonb)
  INTO _questions
  FROM public.perguntas q
  WHERE q.pesquisa_id = _survey.id AND q.ativa = true;

  IF jsonb_array_length(_questions) = 0 THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  RETURN jsonb_build_object(
    'status', 'ready',
    'registryName', _registry.nome_fantasia,
    'pointName', _point.nome,
    'surveyName', _survey.nome,
    'surveyDescription', _survey.descricao,
    'settings', _survey.configuracoes,
    'questions', _questions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_evaluation_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_evaluation_context(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_public_evaluation(
  _code text,
  _idempotency_key uuid,
  _source_hash text,
  _answers jsonb,
  _contact jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cartoquali_private, pg_temp
AS $$
DECLARE
  _point public.pontos_avaliacao%ROWTYPE;
  _survey public.pesquisas%ROWTYPE;
  _registry_status text;
  _question public.perguntas%ROWTYPE;
  _answer jsonb;
  _answer_text text;
  _evaluation_id uuid := gen_random_uuid();
  _rating smallint;
  _resolution text;
  _comment text;
  _improvements text;
  _wants_contact boolean := coalesce((_contact->>'requested')::boolean, false);
  _name text := nullif(trim(_contact->>'name'), '');
  _phone text := nullif(trim(_contact->>'phone'), '');
  _email text := nullif(trim(_contact->>'email'), '');
  _condition_source text;
  _condition_operator text;
  _condition_value jsonb;
  _condition_answer jsonb;
  _visible boolean;
BEGIN
  IF _code IS NULL OR length(trim(_code)) < 3 OR length(trim(_code)) > 80 OR _idempotency_key IS NULL OR _source_hash IS NULL OR length(_source_hash) <> 64 THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;
  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'object' OR pg_column_size(_answers) > 32768 OR pg_column_size(_contact) > 4096 THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM cartoquali_private.public_submission_guards WHERE idempotency_key = _idempotency_key) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;
  IF (SELECT count(*) FROM cartoquali_private.public_submission_guards WHERE source_hash = _source_hash AND created_at > now() - interval '10 minutes') >= 8 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO _point FROM public.pontos_avaliacao WHERE public_slug = lower(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'point_not_found' USING ERRCODE = 'P0001'; END IF;
  IF _point.status <> 'ativo' THEN RAISE EXCEPTION 'point_inactive' USING ERRCODE = 'P0001'; END IF;
  SELECT status INTO _registry_status FROM public.cartorios WHERE id = _point.cartorio_id;
  IF _registry_status IS DISTINCT FROM 'ativo' THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO _survey FROM public.pesquisas WHERE id = _point.pesquisa_id AND cartorio_id = _point.cartorio_id AND status = 'ativa';
  IF NOT FOUND THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE = 'P0001'; END IF;

  FOR _question IN SELECT * FROM public.perguntas WHERE pesquisa_id = _survey.id AND ativa = true ORDER BY ordem LOOP
    _answer := _answers -> _question.id::text;
    _visible := true;
    IF _question.condicao IS NOT NULL THEN
      _condition_source := coalesce(_question.condicao->>'sourceQuestionId', _question.condicao->>'source_question_id');
      _condition_operator := coalesce(_question.condicao->>'operator', 'eq');
      _condition_value := _question.condicao->'value';
      _condition_answer := _answers -> _condition_source;
      IF _condition_operator = 'lte' THEN
        _visible := jsonb_typeof(_condition_answer) = 'number' AND (_condition_answer #>> '{}')::numeric <= (_condition_value #>> '{}')::numeric;
      ELSE
        _visible := _condition_answer = _condition_value OR (_condition_answer #>> '{}') = (_condition_value #>> '{}');
      END IF;
    END IF;

    IF _visible AND _question.obrigatoria AND (_answer IS NULL OR _answer = 'null'::jsonb OR _answer = '""'::jsonb OR _answer = '[]'::jsonb) THEN
      RAISE EXCEPTION 'required_answer_missing' USING ERRCODE = '22023';
    END IF;
    IF NOT _visible OR _answer IS NULL OR _answer = 'null'::jsonb OR _answer = '""'::jsonb OR _answer = '[]'::jsonb THEN CONTINUE; END IF;

    IF _question.tipo IN ('stars','scale') THEN
      IF jsonb_typeof(_answer) <> 'number' OR (_answer #>> '{}')::numeric NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE = '22023'; END IF;
      IF _question.dimensao = 'overall' AND _rating IS NULL THEN _rating := (_answer #>> '{}')::smallint; END IF;
    ELSIF _question.tipo = 'yes_no' THEN
      IF NOT EXISTS (SELECT 1 FROM public.opcoes_resposta o WHERE o.pergunta_id = _question.id AND (to_jsonb(o.valor) = _answer OR to_jsonb(o.texto) = _answer))
         AND (_answer #>> '{}') NOT IN ('Sim','Não','sim','nao','não','Parcialmente','parcialmente') THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE = '22023'; END IF;
    ELSIF _question.tipo = 'single_choice' THEN
      IF jsonb_typeof(_answer) <> 'string' OR NOT EXISTS (SELECT 1 FROM public.opcoes_resposta o WHERE o.pergunta_id = _question.id AND (to_jsonb(o.valor) = _answer OR to_jsonb(o.texto) = _answer)) THEN RAISE EXCEPTION 'invalid_option' USING ERRCODE = '22023'; END IF;
    ELSIF _question.tipo = 'multiple_choice' THEN
      IF jsonb_typeof(_answer) <> 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(_answer) v WHERE NOT EXISTS (SELECT 1 FROM public.opcoes_resposta o WHERE o.pergunta_id = _question.id AND (o.valor = v.value OR o.texto = v.value))) THEN RAISE EXCEPTION 'invalid_option' USING ERRCODE = '22023'; END IF;
    ELSIF _question.tipo = 'text' THEN
      IF jsonb_typeof(_answer) <> 'string' OR length(_answer #>> '{}') > 1000 THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE = '22023'; END IF;
    ELSE
      RAISE EXCEPTION 'invalid_question_type' USING ERRCODE = '22023';
    END IF;

    _answer_text := CASE WHEN jsonb_typeof(_answer) = 'string' THEN _answer #>> '{}' ELSE NULL END;
    IF _question.dimensao = 'resolution' THEN
      _resolution := CASE lower(coalesce(_answer_text,'')) WHEN 'sim' THEN 'sim' WHEN 'parcialmente' THEN 'parcialmente' WHEN 'não' THEN 'nao' WHEN 'nao' THEN 'nao' ELSE NULL END;
    END IF;
    IF _question.tipo = 'text' AND _question.dimensao = 'comment' THEN _comment := nullif(trim(_answer_text),''); END IF;
    IF _question.tipo = 'multiple_choice' AND _question.dimensao = 'comment' THEN _improvements := array_to_string(ARRAY(SELECT jsonb_array_elements_text(_answer)), ', '); END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_answers) supplied(key) WHERE NOT EXISTS (SELECT 1 FROM public.perguntas q WHERE q.id::text = supplied.key AND q.pesquisa_id = _survey.id AND q.ativa = true)) THEN
    RAISE EXCEPTION 'unknown_question' USING ERRCODE = '22023';
  END IF;
  IF _rating IS NULL THEN
    SELECT (_answers->q.id::text #>> '{}')::smallint INTO _rating FROM public.perguntas q WHERE q.pesquisa_id = _survey.id AND q.ativa AND q.tipo IN ('stars','scale') AND _answers ? q.id::text ORDER BY q.ordem LIMIT 1;
  END IF;
  IF _rating IS NULL OR _rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'rating_required' USING ERRCODE = '22023'; END IF;

  IF _wants_contact THEN
    IF _name IS NULL OR length(_name) > 100 OR (_phone IS NULL AND _email IS NULL) OR coalesce(length(_phone),0) > 30 OR coalesce(length(_email),0) > 255 OR (_email IS NOT NULL AND _email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') THEN
      RAISE EXCEPTION 'invalid_contact' USING ERRCODE = '22023';
    END IF;
  ELSE
    _name := NULL; _phone := NULL; _email := NULL;
  END IF;

  INSERT INTO cartoquali_private.public_submission_guards(idempotency_key, source_hash) VALUES (_idempotency_key, _source_hash);
  INSERT INTO public.avaliacoes(id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, motivo_insatisfacao, deseja_contato, nome_contato, telefone_contato, email_contato, anonymous, status)
  VALUES (_evaluation_id, _point.cartorio_id, _point.id, _survey.id, _rating, _resolution, _comment, _improvements, _wants_contact, _name, _phone, _email, NOT _wants_contact, 'nova');

  INSERT INTO public.respostas(avaliacao_id, pergunta_id, valor, resposta_texto)
  SELECT _evaluation_id, q.id, _answers->q.id::text,
    CASE WHEN jsonb_typeof(_answers->q.id::text) = 'string' THEN _answers->q.id::text #>> '{}' ELSE NULL END
  FROM public.perguntas q
  WHERE q.pesquisa_id = _survey.id AND q.ativa = true AND _answers ? q.id::text
    AND _answers->q.id::text <> 'null'::jsonb AND _answers->q.id::text <> '""'::jsonb AND _answers->q.id::text <> '[]'::jsonb;

  DELETE FROM cartoquali_private.public_submission_guards WHERE created_at < now() - interval '1 day';
  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_evaluation(text, uuid, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_evaluation(text, uuid, text, jsonb, jsonb) TO service_role;