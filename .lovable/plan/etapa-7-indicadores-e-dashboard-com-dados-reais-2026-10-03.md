# Etapa 7 — Indicadores e Dashboard com dados reais

## Objetivo
Substituir exclusivamente os dados fictícios do Dashboard e dos indicadores de Qualidade por métricas reais do Supabase, mantendo isolamento por cartório, permissões existentes e sem iniciar a Etapa 8.

## Implementação
1. Criar uma consulta agregada autenticada para o período atual e o período anterior, protegida pelo usuário e cartório da sessão, com filtros reais por ponto e pesquisa.
2. Calcular no banco: total, média, satisfação (notas 4–5), negativas (notas 1–3), distribuição 1–5, comentários, solicitações de contato, série temporal e desempenho por ponto.
3. Calcular dimensões apenas a partir de respostas compatíveis ligadas a perguntas configuradas; converter escala 1–5 e resolutividade para índice percentual e retornar “Dados insuficientes” quando não houver base válida.
4. Adotar `America/Sao_Paulo` para limites de Hoje, 7/30/90 dias, mês atual, mês anterior e intervalo personalizado; o período anterior terá duração imediatamente equivalente.
5. Conectar `/dashboard` e as seções analíticas de `/qualidade` por TanStack Query, com atualização manual/reconsulta, loading, erro, vazio e sucesso sem fallback fictício.
6. Preservar nesta etapa os módulos ainda mockados de ocorrências e planos de melhoria, separando-os visualmente dos indicadores reais para não sugerir que foram migrados.
7. Remover somente os mocks substituídos dos dois painéis e registrar a nova fronteira real em `AGENTS.md`.

## Segurança e performance
- Usar função autenticada com RLS e resolução de tenant no servidor; o navegador não envia nem escolhe `cartorio_id`.
- Não usar `service_role` nem segredos no frontend.
- Retornar agregados e séries compactas em uma chamada, aproveitando os índices existentes; criar índice adicional somente se a análise justificar.
- Manter os perfis atuais: PLATFORM_ADMIN, CARTORIO_ADMIN, GESTOR e OPERADOR, sem ampliar privilégios.

## Validação
- Inserir fixtures temporárias conhecidas (10 notas: 1, 2, 3, 4, 4, 5, 5, 5, 5, 5), conferir manualmente total, média, percentuais e distribuição, e removê-las ao final.
- Testar hoje, 7/30/90 dias, mês atual, mês anterior, vazio e personalizado, incluindo combinações com ponto e pesquisa.
- Testar dois tenants e os quatro perfis, inclusive tentativa de manipular identificadores.
- Confirmar consistência matemática, atualização após nova avaliação, ausência de segredos e estados de erro/sem dados.
- Validar desktop, tablet e celular sem rolagem horizontal.
- Criar `DASHBOARD_INDICATORS.md`, relatório final e matriz dos 21 itens; classificar somente conforme evidências reais.

## Fora do escopo
Ocorrências automáticas, migração de ocorrências/planos, PDFs, notificações, pagamentos, IA, benchmarking, NFC avançado e integrações externas. A Etapa 8 não será iniciada.
