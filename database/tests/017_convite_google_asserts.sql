-- Verificações do convite para o Google e dos motivos de melhoria. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261030010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
-- O isolamento das novas colunas entre cartórios é coberto por 006_isolamento_entre_cartorios.sql.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _melhoria uuid;
  _comentario uuid;
  _overall uuid;
  _ans jsonb;
  _result jsonb;
  _eval uuid;
  _ctx jsonb;
begin
  perform set_config('request.jwt.claims', '', true);

  select q.id into _melhoria
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.tipo = 'multiple_choice' and q.dimensao = 'comment' and q.ativa limit 1;
  select q.id into _comentario
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.tipo = 'text' and q.ativa limit 1;
  select q.id into _overall
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.chave_essencial = 'overall' limit 1;
  if _melhoria is null or _comentario is null or _overall is null then
    raise exception 'FALHA pré: perguntas do DEMO não encontradas';
  end if;

  select jsonb_object_agg(q.id::text,
           case when q.chave_essencial = 'overall' then to_jsonb(2)
                when q.tipo in ('stars', 'scale') then to_jsonb(5)
                else to_jsonb('sim'::text) end)
    into _ans
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.ativa and q.tipo in ('stars', 'scale', 'yes_no');

  -- a) nota 2 com motivos: códigos fixos, na ordem canônica; o texto original continua igual
  _result := public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans || jsonb_build_object(_melhoria::text, jsonb_build_object('values',
      jsonb_build_array('Outro', 'Tempo de atendimento', 'Clareza das informações'), 'other', 'Fila')),
    '{}'::jsonb, null, false);
  _eval := (_result->>'evaluationId')::uuid;
  if _eval is null then raise exception 'FALHA a: envio não devolveu evaluationId: %', _result; end if;
  if (select motivos from public.avaliacoes where id = _eval) is distinct from array['demora','informacao','outro'] then
    raise exception 'FALHA a2: motivos = %', (select motivos from public.avaliacoes where id = _eval);
  end if;

  -- b) comentário marcado como obrigatório pelo cartório: o envio sem comentário passa mesmo assim
  update public.perguntas set obrigatoria = true where id = _comentario;
  _result := public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans, '{}'::jsonb, null, false);
  _eval := (_result->>'evaluationId')::uuid;
  if (select comentario from public.avaliacoes where id = _eval) is not null then
    raise exception 'FALHA b: comentário deveria ficar nulo';
  end if;
  if (select motivos from public.avaliacoes where id = _eval) is not null then
    raise exception 'FALHA b2: sem resposta de melhoria não pode haver motivos';
  end if;

  -- c) "Nada a melhorar" não vira motivo
  _result := public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans || jsonb_build_object(_melhoria::text, jsonb_build_array('Nada a melhorar')), '{}'::jsonb, null, false);
  if (select motivos from public.avaliacoes where id = (_result->>'evaluationId')::uuid) is not null then
    raise exception 'FALHA c: "Nada a melhorar" virou motivo';
  end if;

  -- d) código fora da lista é recusado pelo banco
  begin
    update public.avaliacoes set motivos = array['qualquer'] where id = _eval;
    raise exception 'FALHA d: aceitou motivo fora da lista';
  exception when check_violation then null;
  end;

  -- e) convite desligado: contexto sem place_id e clique recusado
  update public.configuracoes_cartorio set google_convite_ativo = false, google_place_id = null where cartorio_id = _demo;
  _ctx := public.get_public_evaluation_context('CQ-BAL-001');
  if _ctx->'settings'->>'googlePlaceId' is not null then raise exception 'FALHA e: place_id exposto com convite desligado'; end if;
  if public.registrar_clique_google(_eval) then raise exception 'FALHA e2: clique aceito com convite desligado'; end if;

  -- f) ligar o convite exige perfil do Google
  begin
    update public.configuracoes_cartorio set google_convite_ativo = true where cartorio_id = _demo;
    raise exception 'FALHA f: convite ligado sem place_id';
  exception when check_violation then null;
  end;

  -- g) convite ligado: place_id no contexto; primeiro clique aceito, segundo recusado
  update public.configuracoes_cartorio
  set google_place_id = 'ChIJDryRunPlaceId0001', google_place_nome = 'Cartório DEMO', google_convite_ativo = true
  where cartorio_id = _demo;
  _ctx := public.get_public_evaluation_context('CQ-BAL-001');
  if _ctx->'settings'->>'googlePlaceId' is distinct from 'ChIJDryRunPlaceId0001' then
    raise exception 'FALHA g: contexto sem place_id: %', _ctx->'settings';
  end if;
  if not public.registrar_clique_google(_eval) then raise exception 'FALHA g2: primeiro clique recusado'; end if;
  if public.registrar_clique_google(_eval) then raise exception 'FALHA g3: segundo clique aceito'; end if;

  -- h) avaliação com mais de 30 minutos e avaliação de teste: recusadas
  _result := public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans, '{}'::jsonb, null, false);
  _eval := (_result->>'evaluationId')::uuid;
  update public.avaliacoes set created_at = now() - interval '31 minutes' where id = _eval;
  if public.registrar_clique_google(_eval) then raise exception 'FALHA h: clique aceito em avaliação antiga'; end if;
  update public.avaliacoes set created_at = now(), is_test = true where id = _eval;
  if public.registrar_clique_google(_eval) then raise exception 'FALHA h2: clique aceito em avaliação de teste'; end if;
  if public.registrar_clique_google(gen_random_uuid()) then raise exception 'FALHA h3: clique aceito em avaliação inexistente'; end if;

  -- i) ninguém além do servidor chama o registro do clique; anônimo não lê cartórios nem configurações
  if has_function_privilege('anon', 'public.registrar_clique_google(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.registrar_clique_google(uuid)', 'execute') then
    raise exception 'FALHA i: registrar_clique_google executável fora do servidor';
  end if;
  if has_table_privilege('anon', 'public.cartorios', 'select')
     or has_table_privilege('anon', 'public.configuracoes_cartorio', 'select') then
    raise exception 'FALHA i2: anônimo com SELECT em cartorios/configuracoes_cartorio';
  end if;
  if has_column_privilege('authenticated', 'public.avaliacoes', 'google_clicado_em', 'update') then
    raise exception 'FALHA i3: equipe consegue alterar google_clicado_em';
  end if;

  -- j) busca no Google: visitante anônimo é recusado
  begin
    perform public.registrar_busca_google_places();
    raise exception 'FALHA j: busca aceita sem sessão';
  exception when others then
    if sqlerrm <> 'forbidden' then raise exception 'FALHA j: erro inesperado: %', sqlerrm; end if;
  end;

  -- k) painel devolve os novos indicadores (sem sessão, conferimos só a forma pela definição)
  if position('googleClicks' in pg_get_functiondef('public.get_dashboard_indicators(timestamptz,timestamptz,timestamptz,timestamptz,uuid,uuid,text,uuid)'::regprocedure)) = 0 then
    raise exception 'FALHA k: get_dashboard_indicators sem googleClicks';
  end if;

  raise exception 'DRY_RUN_OK: convite Google/motivos (a-k passaram, nada foi gravado)';
end $$;
