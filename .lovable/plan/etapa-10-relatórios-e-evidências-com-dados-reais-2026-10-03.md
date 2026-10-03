# Etapa 10 — Relatórios e Evidências com dados reais

## Bloqueio de entrada
1. Concluir primeiro as duas pendências verificáveis da Etapa 9: ciclo completo/permissões/multi-tenant/responsividade e documentação com matriz final. A Etapa 10 só prossegue se Planos de Melhoria estiver validada, pois seus dados fazem parte dos relatórios.

## Implementação
1. Auditar e remover exclusivamente as fontes simuladas de Relatórios e Visão Executiva, preservando páginas, filtros, impressão e módulos já conectados ao Supabase.
2. Criar uma agregação autenticada e tenant-scoped para o relatório consolidado, reutilizando as fórmulas já validadas do Dashboard e consultando avaliações, respostas, dimensões, pontos, pesquisas, ocorrências e planos em uma única fronteira de dados.
3. Aplicar períodos com limites semiabertos no fuso `America/Sao_Paulo`, comparação anterior equivalente e granularidade diária, semanal ou mensal. Filtros: período, ponto, pesquisa e status aplicável.
4. Entregar resumo executivo, evolução, distribuição 1–5, dimensões com estado “Sem dados suficientes”, desempenho por ponto, ocorrências, planos e evidências do ciclo Avaliação → Ocorrência → Plano → Resultado.
5. Conectar detalhamentos às páginas reais de Avaliações, Ocorrências e Planos por filtros seguros, sem incluir contato voluntário ou outros dados pessoais no relatório geral.
6. Implementar CSV no servidor a partir do mesmo recorte autorizado, com minimização de dados. Manter impressão do navegador como saída profissional; registrar PDF dedicado como ressalva se não houver suporte maduro, sem adicionar biblioteca frágil.
7. Implementar estados de carregamento, vazio, erro, sucesso e exportação, sem fallback fictício. Remover histórico e datas simuladas do catálogo e toda dependência do provider mock nas páginas de relatório.

## Detalhes técnicos
- Server functions protegidas por `requireSupabaseAuth`; RLS decide o cartório e os papéis existentes limitam detalhes.
- RPC `SECURITY INVOKER`, sem `service_role` no cliente, retornando apenas campos necessários e agregados consistentes com `get_dashboard_indicators`.
- Índices adicionais somente se o plano de execução demonstrar necessidade; nenhuma tabela nova é prevista.
- Contratos tipados específicos para o relatório real; componentes de apresentação não consultam mocks nem montam regras de negócio.

## Validação
1. Fixture controlada com valores conhecidos para conferir total, média, satisfação, negativas, distribuição, ocorrências e planos.
2. Combinações de período, ponto, pesquisa e status; datas próximas da meia-noite; pouca informação; período vazio; falha de consulta e nova tentativa.
3. Matriz Cartório A/Cartório B, IDs e parâmetros manipulados, e papéis `PLATFORM_ADMIN`, `CARTORIO_ADMIN`, `GESTOR` e `OPERADOR` conforme permissões existentes.
4. CSV filtrado aberto e conferido; ausência de contato e dados pessoais; nenhuma chave privilegiada no navegador.
5. Fluxo completo Avaliação → Indicadores → Ocorrência → Plano → Relatório; desktop e celular; TypeScript, build, linter e desempenho.
6. Criar `REPORTS_AND_EVIDENCE.md`, `BACKEND_STAGE_10_REPORT.md` e matriz final de 21 itens, classificando somente pelas evidências obtidas.

## Fora do escopo
Billing, pagamentos, notificações, WhatsApp, IA, benchmarking, NFC avançado, integrações externas, PQTA/ANOREG/CNJ e qualquer item da Etapa 11.