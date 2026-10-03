create or replace function public.submit_public_evaluation(
  _code text,
  _idempotency_key uuid,
  _source_hash text,
  _answers jsonb,
  _contact jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _point public.pontos_avaliacao%rowtype;
  _survey public.pesquisas%rowtype;
  _registry_status text;
  _question public.perguntas%rowtype;
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
begin
  if _code is null or length(trim(_code)) < 3 or length(trim(_code)) > 80 or _idempotency_key is null or _source_hash is null or length(_source_hash) <> 64 then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if _answers is null or jsonb_typeof(_answers) <> 'object' or pg_column_size(_answers) > 32768 or pg_column_size(_contact) > 4096 then
    raise exception 'invalid_request' using errcode = '22023';
  end if;

  if exists (select 1 from cartoquali_private.public_submission_guards where idempotency_key = _idempotency_key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if (select count(*) from cartoquali_private.public_submission_guards where source_hash = _source_hash and created_at > now() - interval '10 minutes') >= 8 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select * into _point from public.pontos_avaliacao
  where public_slug=lower(trim(_code)) or lower(codigo)=lower(trim(_code))
  order by case when lower(codigo)=lower(trim(_code)) then 0 else 1 end
  limit 1;
  if not found then raise exception 'point_not_found' using errcode = 'P0001'; end if;
  if _point.status <> 'ativo' then raise exception 'point_inactive' using errcode = 'P0001'; end if;
  select status into _registry_status from public.cartorios where id = _point.cartorio_id;
  if _registry_status is distinct from 'ativo' then raise exception 'survey_unavailable' using errcode = 'P0001'; end if;
  select * into _survey from public.pesquisas where id = _point.pesquisa_id and cartorio_id = _point.cartorio_id and status = 'ativa';
  if not found then raise exception 'survey_unavailable' using errcode = 'P0001'; end if;

  for _question in select * from public.perguntas where pesquisa_id = _survey.id and ativa = true order by ordem loop
    _answer := _answers -> _question.id::text;
    _visible := true;
    if _question.condicao is not null then
      _condition_source := coalesce(_question.condicao->>'sourceQuestionId', _question.condicao->>'source_question_id');
      _condition_operator := coalesce(_question.condicao->>'operator', 'eq');
      _condition_value := _question.condicao->'value';
      _condition_answer := _answers -> _condition_source;
      if _condition_operator = 'lte' then
        _visible := jsonb_typeof(_condition_answer) = 'number' and (_condition_answer #>> '{}')::numeric <= (_condition_value #>> '{}')::numeric;
      else
        _visible := _condition_answer = _condition_value or (_condition_answer #>> '{}') = (_condition_value #>> '{}');
      end if;
    end if;

    if _visible and _question.obrigatoria and (_answer is null or _answer = 'null'::jsonb or _answer = '""'::jsonb or _answer = '[]'::jsonb) then
      raise exception 'required_answer_missing' using errcode = '22023';
    end if;
    if not _visible or _answer is null or _answer = 'null'::jsonb or _answer = '""'::jsonb or _answer = '[]'::jsonb then continue; end if;

    if _question.tipo in ('stars','scale') then
      if jsonb_typeof(_answer) <> 'number' or (_answer #>> '{}')::numeric not between 1 and 5 then raise exception 'invalid_answer' using errcode = '22023'; end if;
      if _question.dimensao = 'overall' and _rating is null then _rating := (_answer #>> '{}')::smallint; end if;
    elsif _question.tipo = 'yes_no' then
      if not exists (select 1 from public.opcoes_resposta o where o.pergunta_id = _question.id and (to_jsonb(o.valor) = _answer or to_jsonb(o.texto) = _answer))
         and (_answer #>> '{}') not in ('Sim','Não','sim','nao','não','Parcialmente','parcialmente') then raise exception 'invalid_answer' using errcode = '22023'; end if;
    elsif _question.tipo = 'single_choice' then
      if jsonb_typeof(_answer) <> 'string' or not exists (select 1 from public.opcoes_resposta o where o.pergunta_id = _question.id and (to_jsonb(o.valor) = _answer or to_jsonb(o.texto) = _answer)) then raise exception 'invalid_option' using errcode = '22023'; end if;
    elsif _question.tipo = 'multiple_choice' then
      if jsonb_typeof(_answer) <> 'array' or exists (select 1 from jsonb_array_elements_text(_answer) v where not exists (select 1 from public.opcoes_resposta o where o.pergunta_id = _question.id and (o.valor = v.value or o.texto = v.value))) then raise exception 'invalid_option' using errcode = '22023'; end if;
    elsif _question.tipo = 'text' then
      if jsonb_typeof(_answer) <> 'string' or length(_answer #>> '{}') > 1000 then raise exception 'invalid_answer' using errcode = '22023'; end if;
    else
      raise exception 'invalid_question_type' using errcode = '22023';
    end if;

    _answer_text := case when jsonb_typeof(_answer) = 'string' then _answer #>> '{}' else null end;
    if _question.dimensao = 'resolution' then _resolution := case lower(coalesce(_answer_text,'')) when 'sim' then 'sim' when 'parcialmente' then 'parcialmente' when 'não' then 'nao' when 'nao' then 'nao' else null end; end if;
    if _question.tipo = 'text' and _question.dimensao = 'comment' then _comment := nullif(trim(_answer_text),''); end if;
    if _question.tipo = 'multiple_choice' and _question.dimensao = 'comment' then _improvements := array_to_string(array(select jsonb_array_elements_text(_answer)), ', '); end if;
  end loop;

  if exists (select 1 from jsonb_object_keys(_answers) supplied(key) where not exists (select 1 from public.perguntas q where q.id::text = supplied.key and q.pesquisa_id = _survey.id and q.ativa = true)) then raise exception 'unknown_question' using errcode = '22023'; end if;
  if _rating is null then select (_answers->q.id::text #>> '{}')::smallint into _rating from public.perguntas q where q.pesquisa_id = _survey.id and q.ativa and q.tipo in ('stars','scale') and _answers ? q.id::text order by q.ordem limit 1; end if;
  if _rating is null or _rating not between 1 and 5 then raise exception 'rating_required' using errcode = '22023'; end if;

  if _wants_contact then
    if _name is null or length(_name) > 100 or (_phone is null and _email is null) or coalesce(length(_phone),0) > 30 or coalesce(length(_email),0) > 255 or (_email is not null and _email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') then raise exception 'invalid_contact' using errcode = '22023'; end if;
  else
    _name := null; _phone := null; _email := null;
  end if;

  insert into cartoquali_private.public_submission_guards(idempotency_key, source_hash) values (_idempotency_key, _source_hash);
  insert into public.avaliacoes(id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, motivo_insatisfacao, deseja_contato, nome_contato, telefone_contato, email_contato, anonymous, status)
  values (_evaluation_id, _point.cartorio_id, _point.id, _survey.id, _rating, _resolution, _comment, _improvements, _wants_contact, _name, _phone, _email, not _wants_contact, 'nova');
  insert into public.respostas(avaliacao_id, pergunta_id, valor, resposta_texto)
  select _evaluation_id, q.id, _answers->q.id::text, case when jsonb_typeof(_answers->q.id::text) = 'string' then _answers->q.id::text #>> '{}' else null end
  from public.perguntas q where q.pesquisa_id = _survey.id and q.ativa = true and _answers ? q.id::text
    and _answers->q.id::text <> 'null'::jsonb and _answers->q.id::text <> '""'::jsonb and _answers->q.id::text <> '[]'::jsonb;
  delete from cartoquali_private.public_submission_guards where created_at < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;
revoke all on function public.submit_public_evaluation(text,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_public_evaluation(text,uuid,text,jsonb,jsonb) to service_role;