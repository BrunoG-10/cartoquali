-- Execute after the migration and seed. Every assertion is rolled back.
begin;

do $$
declare
  expected_tables text[] := array['cartorios','usuarios','user_roles','pontos_avaliacao','pesquisas','perguntas','opcoes_resposta','avaliacoes','respostas','ocorrencias_qualidade','planos_melhoria','audit_logs'];
  expected_columns integer := 0;
  item text;
begin
  foreach item in array expected_tables loop
    if to_regclass('public.' || item) is null then raise exception 'Tabela ausente: %', item; end if;
  end loop;
  select count(*) into expected_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = any(expected_tables)
    and data_type in ('uuid', 'timestamp with time zone');
  if expected_columns < 24 then raise exception 'UUIDs ou timestamps esperados não foram encontrados'; end if;
end $$;

do $$
declare
  registry_id uuid := 'a0000000-0000-4000-8000-000000000001';
  user_id uuid := 'a0000000-0000-4000-8000-000000000002';
  survey_id uuid := 'a0000000-0000-4000-8000-000000000003';
  point_id uuid := 'a0000000-0000-4000-8000-000000000004';
  question_id uuid := 'a0000000-0000-4000-8000-000000000005';
  review_id uuid := 'a0000000-0000-4000-8000-000000000006';
  occurrence_id uuid := 'a0000000-0000-4000-8000-000000000007';
begin
  insert into public.cartorios (id, razao_social, nome_fantasia, cnpj, tipo, cidade, estado, responsavel, plano)
  values (registry_id, 'VALIDAÇÃO TÉCNICA', 'VALIDAÇÃO', '99.999.999/9999-99', 'Teste', 'Teste', 'PI', 'Teste', 'Teste');
  insert into public.usuarios (id, cartorio_id, nome, email) values (user_id, registry_id, 'VALIDAÇÃO', 'validation@example.invalid');
  insert into public.pesquisas (id, cartorio_id, nome) values (survey_id, registry_id, 'VALIDAÇÃO');
  insert into public.pontos_avaliacao (id, cartorio_id, pesquisa_id, nome, localizacao, codigo, public_slug)
  values (point_id, registry_id, survey_id, 'VALIDAÇÃO', 'VALIDAÇÃO', 'VALIDACAO-001', 'validacao');
  insert into public.perguntas (id, pesquisa_id, texto, tipo, ordem, dimensao)
  values (question_id, survey_id, 'VALIDAÇÃO', 'stars', 1, 'overall');
  insert into public.avaliacoes (id, cartorio_id, ponto_id, pesquisa_id, nota_geral)
  values (review_id, registry_id, point_id, survey_id, 5);
  insert into public.respostas (avaliacao_id, pergunta_id, valor) values (review_id, question_id, '5'::jsonb);
  insert into public.ocorrencias_qualidade (id, cartorio_id, avaliacao_id, ponto_id, titulo, categoria, descricao, prioridade, responsavel_id, status, origem)
  values (occurrence_id, registry_id, review_id, point_id, 'VALIDAÇÃO', 'atendimento', 'VALIDAÇÃO', 'baixa', user_id, 'nova', 'teste');
  insert into public.planos_melhoria (cartorio_id, ocorrencia_id, ponto_id, titulo, problema, objetivo, acao, responsavel_id, prazo, progresso)
  values (registry_id, occurrence_id, point_id, 'VALIDAÇÃO', 'VALIDAÇÃO', 'VALIDAÇÃO', 'VALIDAÇÃO', user_id, current_date, 25);
end $$;

do $$
begin
  begin
    insert into public.pontos_avaliacao (cartorio_id, pesquisa_id, nome, localizacao, codigo, public_slug)
    values (gen_random_uuid(), '30000000-0000-4000-8000-000000000001', 'INVÁLIDO', 'INVÁLIDO', 'INVALIDO-1', 'invalido-1');
    raise exception 'FK não bloqueou ponto sem cartório';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.avaliacoes (cartorio_id, ponto_id, pesquisa_id, nota_geral)
    values (gen_random_uuid(), '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5);
    raise exception 'FK não bloqueou avaliação sem cartório';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.respostas (avaliacao_id, pergunta_id, valor)
    values (gen_random_uuid(), '50000000-0000-4000-8000-000000000001', '5'::jsonb);
    raise exception 'FK não bloqueou resposta sem avaliação';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem, dimensao)
    values (gen_random_uuid(), 'INVÁLIDO', 'stars', 99, 'overall');
    raise exception 'FK não bloqueou pergunta sem pesquisa';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.planos_melhoria (cartorio_id, ocorrencia_id, titulo, problema, objetivo, acao, prazo, progresso)
    values ('10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'INVÁLIDO', 'INVÁLIDO', 'INVÁLIDO', 'INVÁLIDO', current_date, 125);
    raise exception 'CHECK não bloqueou progresso acima de 100';
  exception when check_violation then null; end;
  begin
    insert into public.ocorrencias_qualidade (cartorio_id, titulo, categoria, descricao, prioridade, status, origem)
    values ('10000000-0000-4000-8000-000000000001', 'INVÁLIDO', 'outro', 'INVÁLIDO', 'baixa', 'status_invalido', 'teste');
    raise exception 'CHECK não bloqueou status inválido';
  exception when check_violation then null; end;
end $$;

rollback;
