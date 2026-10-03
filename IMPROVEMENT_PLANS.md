# Planos de Melhoria

## Escopo

O módulo `/planos-melhoria` usa `planos_melhoria`, ocorrências, usuários e `audit_logs` reais do Supabase. A lista possui paginação e filtros por status, prioridade, responsável, ocorrência e prazo.

## Segurança e ciclo

- RLS restringe leitura ao cartório da sessão.
- `PLATFORM_ADMIN`, `CARTORIO_ADMIN` e `GESTOR` podem criar e atualizar; `OPERADOR` consulta.
- Criação é idempotente por `(cartorio_id, client_request_id)`.
- Ocorrência, ponto, responsável, autor e cartório são validados no servidor.
- Ciclo: `planejado → em_andamento → concluido`, com cancelamento; estados finais não reabrem.
- Conclusão exige responsável, resultado e observação e fixa progresso em 100%.
- Origem é imutável, atualizações usam controle concorrente por `updated_at` e não há exclusão autenticada.
- Triggers preservam autoria e histórico em `audit_logs`.

## Validação

O fluxo autenticado controlado criou, iniciou e concluiu um plano, confirmou progresso, autoria, conclusão e três eventos de auditoria. A tela foi validada em 1280×1800 e 390×844 sem overflow ou erros de console. Fixtures foram removidas.
