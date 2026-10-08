-- "O que poderia ser melhorado?": texto livre do "Outro" e opção exclusiva "Nada a melhorar".
-- A resposta de escolha múltipla passa a aceitar, além da lista, {"values": [...], "other": "texto"}.
-- O texto vai para respostas.resposta_texto e entra no motivo como "Outro: texto".
-- As funções são alteradas a partir da definição atual no banco (pg_get_functiondef), com trocas
-- exatas: se um trecho não for encontrado, a migração falha em vez de aplicar algo parcial.

create or replace function cartoquali_private.patch_function(_signature text, _pairs text[])
returns void language plpgsql set search_path = pg_catalog, public as $$
declare
  _ddl text := pg_get_functiondef(_signature::regprocedure);
  _i int;
begin
  for _i in 1 .. array_length(_pairs, 1) / 2 loop
    if position(_pairs[_i * 2 - 1] in _ddl) = 0 then
      raise exception 'patch_anchor_not_found: % (#%)', _signature, _i;
    end if;
    _ddl := replace(_ddl, _pairs[_i * 2 - 1], _pairs[_i * 2]);
  end loop;
  execute _ddl;
end $$;

-- Avaliação pública
select cartoquali_private.patch_function(
  'public.submit_public_evaluation(text,uuid,text,jsonb,jsonb,uuid,boolean)',
  array[
    $a$    _answer:=_answers->_question.id::text;$a$,
    $b$    _answer:=_answers->_question.id::text;
    if _question.tipo='multiple_choice' and jsonb_typeof(_answer)='object' then
      if coalesce(jsonb_typeof(_answer->'values'),'')<>'array' or length(coalesce(_answer->>'other',''))>300
         or (nullif(trim(_answer->>'other'),'') is not null
             and not exists(select 1 from jsonb_array_elements_text(_answer->'values') o where o.value ~* '^outro\M')) then
        raise exception 'invalid_answer' using errcode='22023';
      end if;
      _answer:=_answer->'values';
    end if;
    if _question.tipo='multiple_choice' and jsonb_typeof(_answer)='array' and jsonb_array_length(_answer)>1
       and exists(select 1 from jsonb_array_elements_text(_answer) o where o.value ~* '^nada a melhorar') then
      raise exception 'invalid_answer' using errcode='22023';
    end if;$b$,
    $c$_improvements:=array_to_string(array(select jsonb_array_elements_text(_answer)),', ')$c$,
    $d$_improvements:=nullif(array_to_string(array(select case when o.value ~* '^outro\M' and nullif(trim((_answers->(_question.id::text))->>'other'),'') is not null then o.value||': '||trim((_answers->(_question.id::text))->>'other') else o.value end from jsonb_array_elements_text(_answer) o where o.value !~* '^nada a melhorar'),', '),'')$d$,
    $e$select _evaluation_id,q.id,_answers->q.id::text,case when jsonb_typeof(_answers->q.id::text)='string' then _answers->q.id::text#>>'{}' else null end$e$,
    $f$select _evaluation_id,q.id,case when jsonb_typeof(_answers->q.id::text)='object' then (_answers->q.id::text)->'values' else _answers->q.id::text end,case when jsonb_typeof(_answers->q.id::text)='string' then _answers->q.id::text#>>'{}' when jsonb_typeof(_answers->q.id::text)='object' then nullif(trim((_answers->q.id::text)->>'other'),'') else null end$f$
  ]
);

-- Avaliação de teste da implantação (mesmo questionário, outro estilo de escrita)
select cartoquali_private.patch_function(
  'public.submit_onboarding_test_evaluation(text,uuid,uuid,text,jsonb)',
  array[
    $a$_answer:=_answers->_q.id::text; _visible:=true;$a$,
    $b$_answer:=_answers->_q.id::text; _visible:=true;
  IF _q.tipo='multiple_choice' AND jsonb_typeof(_answer)='object' THEN
    IF coalesce(jsonb_typeof(_answer->'values'),'')<>'array' OR length(coalesce(_answer->>'other',''))>300
       OR (nullif(trim(_answer->>'other'),'') IS NOT NULL
           AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(_answer->'values') o WHERE o.value ~* '^outro\M')) THEN
      RAISE EXCEPTION 'invalid_answer' USING ERRCODE='22023';
    END IF;
    _answer:=_answer->'values';
  END IF;
  IF _q.tipo='multiple_choice' AND jsonb_typeof(_answer)='array' AND jsonb_array_length(_answer)>1
     AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(_answer) o WHERE o.value ~* '^nada a melhorar') THEN
    RAISE EXCEPTION 'invalid_answer' USING ERRCODE='22023';
  END IF;$b$,
    $c$_improvements:=array_to_string(ARRAY(SELECT jsonb_array_elements_text(_answer)),', ')$c$,
    $d$_improvements:=nullif(array_to_string(ARRAY(SELECT CASE WHEN o.value ~* '^outro\M' AND nullif(trim((_answers->(_q.id::text))->>'other'),'') IS NOT NULL THEN o.value||': '||trim((_answers->(_q.id::text))->>'other') ELSE o.value END FROM jsonb_array_elements_text(_answer) o WHERE o.value !~* '^nada a melhorar'),', '),'')$d$,
    $e$SELECT _evaluation_id,q.id,_answers->q.id::text,CASE WHEN jsonb_typeof(_answers->q.id::text)='string' THEN _answers->q.id::text#>>'{}' ELSE NULL END$e$,
    $f$SELECT _evaluation_id,q.id,CASE WHEN jsonb_typeof(_answers->q.id::text)='object' THEN (_answers->q.id::text)->'values' ELSE _answers->q.id::text END,CASE WHEN jsonb_typeof(_answers->q.id::text)='string' THEN _answers->q.id::text#>>'{}' WHEN jsonb_typeof(_answers->q.id::text)='object' THEN nullif(trim((_answers->q.id::text)->>'other'),'') ELSE NULL END$f$
  ]
);

-- Novas pesquisas: opções mais claras e "Nada a melhorar"
select cartoquali_private.patch_function(
  'cartoquali_private.seed_survey_questions()',
  array[
    $a$(_melhoria,'Instalações','Instalações',4),$a$,
    $b$(_melhoria,'Instalações (conforto, limpeza, acessibilidade)','Instalações (conforto, limpeza, acessibilidade)',4),$b$,
    $c$(_melhoria,'Outro','Outro',6);$c$,
    $d$(_melhoria,'Outro','Outro',6),
    (_melhoria,'Nada a melhorar','Nada a melhorar',7);$d$
  ]
);

-- Pesquisas existentes: completa as opções que faltam (sem apagar nem renomear as do cartório).
-- Cada opção padrão só entra se nenhuma opção existente já tratar do mesmo assunto.
do $$
declare
  _q record;
  _std record;
  _next int;
begin
  for _q in
    select id from public.perguntas where tipo = 'multiple_choice' and dimensao = 'comment'
  loop
    select coalesce(max(ordem), 0) into _next from public.opcoes_resposta where pergunta_id = _q.id;
    for _std in
      select * from (values
        (1, 'Tempo de espera', '(tempo|espera|demora|fila)'),
        (2, 'Cordialidade no atendimento', '(cordial|educa|respeito|simpatia)'),
        (3, 'Clareza das informações', '(clareza|informa|orienta)'),
        (4, 'Instalações (conforto, limpeza, acessibilidade)', '(instala|estrutura|limpeza|conforto|acessib)'),
        (5, 'Resolução do meu pedido', '(resolu|resolv)'),
        (6, 'Outro', '^outro\M'),
        (7, 'Nada a melhorar', '^nada a melhorar')
      ) as s(pos, texto, pattern)
      order by pos
    loop
      if not exists (
        select 1 from public.opcoes_resposta o where o.pergunta_id = _q.id and o.texto ~* _std.pattern
      ) then
        _next := _next + 1;
        insert into public.opcoes_resposta(pergunta_id, texto, valor, ordem)
        values (_q.id, _std.texto, _std.texto, _next);
      end if;
    end loop;
  end loop;
end $$;

-- "Nada a melhorar" fica por último, depois de "Outro", em todas as perguntas de melhoria.
update public.opcoes_resposta o
set ordem = o.ordem + 1000
where o.texto ~* '^nada a melhorar'
  and exists (select 1 from public.perguntas q where q.id = o.pergunta_id and q.tipo = 'multiple_choice' and q.dimensao = 'comment');

drop function cartoquali_private.patch_function(text, text[]);
