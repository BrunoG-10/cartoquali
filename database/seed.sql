begin;

insert into public.cartorios (id, razao_social, nome_fantasia, cnpj, tipo, telefone, email, cep, endereco, numero, bairro, cidade, estado, responsavel, status, plano)
values ('10000000-0000-4000-8000-000000000001', 'CARTÓRIO DEMO DE REGISTRO CIVIL LTDA', 'Cartório Modelo DEMO', '00.000.000/0001-00', 'Registro Civil', '(00) 3000-0000', 'demo@example.invalid', '00000-000', 'Avenida Demonstração', '100', 'Centro', 'Cidade Teste', 'PI', 'Responsável DEMO', 'ativo', 'Profissional')
on conflict (id) do nothing;

insert into public.usuarios (id, cartorio_id, nome, email, telefone, status) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Usuária Administradora DEMO', 'admin@example.invalid', '(00) 90000-0001', 'ativo'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Usuário Gestor DEMO', 'gestor@example.invalid', '(00) 90000-0002', 'ativo'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Usuária Operadora DEMO', 'operador@example.invalid', '(00) 90000-0003', 'ativo')
on conflict (id) do nothing;

insert into public.user_roles (id, user_id, role) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'CARTORIO_ADMIN'),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'GESTOR'),
  ('21000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'OPERADOR')
on conflict (id) do nothing;

insert into public.pesquisas (id, cartorio_id, nome, descricao, status, versao, configuracoes)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Pesquisa de Atendimento DEMO', 'Pesquisa padrão para validação estrutural.', 'ativa', '1.0', '{"allowAnonymous":true,"allowComment":true}'::jsonb)
on conflict (id) do nothing;

insert into public.pontos_avaliacao (id, cartorio_id, pesquisa_id, nome, localizacao, codigo, descricao, status, public_slug) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Recepção DEMO', 'Entrada principal', 'CQ-REC-001', 'Ponto de teste da recepção.', 'ativo', 'recepcao-demo'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Balcão DEMO', 'Salão de atendimento', 'CQ-BAL-001', 'Ponto de teste do balcão.', 'ativo', 'balcao-demo'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Saída DEMO', 'Saída principal', 'CQ-SAI-001', 'Ponto de teste da saída.', 'ativo', 'saida-demo')
on conflict (id) do nothing;

insert into public.perguntas (id, pesquisa_id, texto, tipo, ordem, obrigatoria, ativa, dimensao) values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Como você avalia sua experiência geral?', 'stars', 1, true, true, 'overall'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Seu atendimento foi resolvido?', 'yes_no', 2, true, true, 'resolution'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Como você avalia o tempo de atendimento?', 'scale', 3, true, true, 'time'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'O que poderia ser melhorado?', 'multiple_choice', 4, false, true, 'comment'),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'Deixe um comentário.', 'text', 5, false, true, 'comment')
on conflict (id) do nothing;

insert into public.opcoes_resposta (id, pergunta_id, texto, valor, ordem) values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Sim', 'sim', 1),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'Parcialmente', 'parcialmente', 2),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', 'Não', 'nao', 3),
  ('51000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000004', 'Tempo de atendimento', 'tempo', 1),
  ('51000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000004', 'Clareza das informações', 'clareza', 2)
on conflict (id) do nothing;

insert into public.avaliacoes (id, cartorio_id, ponto_id, pesquisa_id, nota_geral, atendimento_resolvido, comentario, deseja_contato, anonymous, status, created_at) values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5, 'sim', 'Atendimento DEMO concluído.', false, true, 'respondida', '2026-10-01T10:00:00Z'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 3, 'parcialmente', 'Espera acima do esperado — DEMO.', false, true, 'em_analise', '2026-10-01T11:00:00Z'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 4, 'sim', null, false, true, 'respondida', '2026-10-01T12:00:00Z')
on conflict (id) do nothing;

insert into public.respostas (id, avaliacao_id, pergunta_id, valor, resposta_texto) values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '5'::jsonb, null),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '"sim"'::jsonb, null),
  ('70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '3'::jsonb, null),
  ('70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000005', null, 'Espera acima do esperado — DEMO.')
on conflict (id) do nothing;

insert into public.ocorrencias_qualidade (id, cartorio_id, avaliacao_id, ponto_id, titulo, categoria, descricao, prioridade, responsavel_id, status, origem, prazo, data_abertura, observacao) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Demora no atendimento DEMO', 'tempo', 'Demora relatada na avaliação DEMO.', 'alta', '20000000-0000-4000-8000-000000000002', 'em_tratamento', 'avaliacao_usuario', '2026-10-10', '2026-10-01T11:05:00Z', 'Analisar escala de atendimento.'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', null, '40000000-0000-4000-8000-000000000001', 'Revisão das orientações DEMO', 'clareza', 'Material de orientação precisa de revisão — DEMO.', 'media', '20000000-0000-4000-8000-000000000001', 'nova', 'equipe_cartorio', '2026-10-15', '2026-10-01T13:00:00Z', null)
on conflict (id) do nothing;

insert into public.planos_melhoria (id, cartorio_id, ocorrencia_id, ponto_id, dimensao, titulo, problema, objetivo, acao, responsavel_id, prioridade, prazo, status, progresso, resultado_esperado) values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'time', 'Reduzir espera DEMO', 'Pico de espera no início do expediente.', 'Reduzir a espera percebida.', 'Reorganizar a escala de atendimento.', '20000000-0000-4000-8000-000000000002', 'alta', '2026-10-20', 'em_andamento', 50, 'Elevar o índice de tempo.'),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'clarity', 'Revisar orientações DEMO', 'Orientações desatualizadas.', 'Aumentar a clareza.', 'Revisar e publicar material de orientação.', '20000000-0000-4000-8000-000000000001', 'media', '2026-10-25', 'planejado', 0, 'Informações mais claras.')
on conflict (id) do nothing;

commit;
