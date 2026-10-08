-- Verificações do texto livre do "Outro" e de "Nada a melhorar". Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261010010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _melhoria uuid;
  _ans jsonb;
  _eval uuid;
  _n int;
  _texts text[];
  _survey uuid;
begin
  perform set_config('request.jwt.claims', '', true);

  -- a) a pergunta de melhoria do DEMO ganhou as opções que faltavam, com "Outro" e "Nada a melhorar"
  select q.id into _melhoria
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.tipo = 'multiple_choice' and q.dimensao = 'comment' and q.ativa
  limit 1;
  if _melhoria is null then raise exception 'FALHA pré: pergunta de melhoria do DEMO não encontrada'; end if;
  select array_agg(texto order by ordem) into _texts from public.opcoes_resposta where pergunta_id = _melhoria;
  if not ('Outro' = any(_texts)) or not ('Nada a melhorar' = any(_texts)) or not ('Cordialidade no atendimento' = any(_texts)) then
    raise exception 'FALHA a: opções do DEMO: %', _texts;
  end if;
  if _texts[array_length(_texts, 1)] <> 'Nada a melhorar' then raise exception 'FALHA a2: "Nada a melhorar" não é a última: %', _texts; end if;

  -- respostas válidas: nota geral 2 (abre a pergunta de melhoria), demais notas 5, sim/não = sim
  select jsonb_object_agg(q.id::text,
           case when q.chave_essencial = 'overall' then to_jsonb(2)
                when q.tipo in ('stars', 'scale') then to_jsonb(5)
                else to_jsonb('sim'::text) end)
    into _ans
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.ativa and q.tipo in ('stars', 'scale', 'yes_no');

  -- b) "Outro" com texto: lista em valor, texto em resposta_texto, motivo "Outro: texto"
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans || jsonb_build_object(_melhoria::text, jsonb_build_object('values', jsonb_build_array('Tempo de atendimento', 'Outro'), 'other', '  Fila sem senha  ')),
    '{}'::jsonb, null, false);
  select a.id into _eval from public.avaliacoes a where a.cartorio_id = _demo order by a.created_at desc limit 1;
  if not exists (select 1 from public.respostas r where r.avaliacao_id = _eval and r.pergunta_id = _melhoria
                 and r.valor = jsonb_build_array('Tempo de atendimento', 'Outro') and r.resposta_texto = 'Fila sem senha') then
    raise exception 'FALHA b: resposta do Outro não gravada como esperado';
  end if;
  if (select motivo_insatisfacao from public.avaliacoes where id = _eval) <> 'Tempo de atendimento, Outro: Fila sem senha' then
    raise exception 'FALHA b2: motivo = %', (select motivo_insatisfacao from public.avaliacoes where id = _eval);
  end if;

  -- c) formato antigo (lista) continua aceito
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans || jsonb_build_object(_melhoria::text, jsonb_build_array('Outro')), '{}'::jsonb, null, false);

  -- d) "Nada a melhorar" sozinho: aceito, sem motivo de insatisfação
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans || jsonb_build_object(_melhoria::text, jsonb_build_array('Nada a melhorar')), '{}'::jsonb, null, false);
  select a.id into _eval from public.avaliacoes a where a.cartorio_id = _demo order by a.created_at desc limit 1;
  if (select motivo_insatisfacao from public.avaliacoes where id = _eval) is not null then
    raise exception 'FALHA d: "Nada a melhorar" virou motivo';
  end if;

  -- e) "Nada a melhorar" junto com outra opção é recusado
  begin
    perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
      _ans || jsonb_build_object(_melhoria::text, jsonb_build_array('Nada a melhorar', 'Outro')), '{}'::jsonb, null, false);
    raise exception 'FALHA e: aceitou "Nada a melhorar" com outra opção';
  exception when others then
    if sqlerrm <> 'invalid_answer' then raise exception 'FALHA e: erro inesperado: %', sqlerrm; end if;
  end;

  -- f) texto sem "Outro" marcado é recusado
  begin
    perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
      _ans || jsonb_build_object(_melhoria::text, jsonb_build_object('values', jsonb_build_array('Tempo de atendimento'), 'other', 'x')),
      '{}'::jsonb, null, false);
    raise exception 'FALHA f: aceitou texto sem Outro';
  exception when others then
    if sqlerrm <> 'invalid_answer' then raise exception 'FALHA f: erro inesperado: %', sqlerrm; end if;
  end;

  -- g) texto acima de 300 caracteres é recusado
  begin
    perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
      _ans || jsonb_build_object(_melhoria::text, jsonb_build_object('values', jsonb_build_array('Outro'), 'other', repeat('a', 301))),
      '{}'::jsonb, null, false);
    raise exception 'FALHA g: aceitou texto longo';
  exception when others then
    if sqlerrm <> 'invalid_answer' then raise exception 'FALHA g: erro inesperado: %', sqlerrm; end if;
  end;

  -- h) pesquisa nova nasce com as 7 opções, "Nada a melhorar" por último
  insert into public.pesquisas(cartorio_id, nome, status, versao, configuracoes) values (_demo, 'Dry run', 'rascunho', '1.0', '{}')
    returning id into _survey;
  select array_agg(o.texto order by o.ordem) into _texts
  from public.opcoes_resposta o join public.perguntas q on q.id = o.pergunta_id
  where q.pesquisa_id = _survey and q.tipo = 'multiple_choice' and q.dimensao = 'comment';
  if array_length(_texts, 1) <> 7 or _texts[7] <> 'Nada a melhorar' or not ('Instalações (conforto, limpeza, acessibilidade)' = any(_texts)) then
    raise exception 'FALHA h: opções da pesquisa nova: %', _texts;
  end if;

  raise exception 'DRY_RUN_OK: melhoria/outro (a-h passaram, nada foi gravado)';
end $$;
