# Etapa 9 — Planos de Melhoria com dados reais

## Objetivo
Migrar exclusivamente o módulo de Planos de Melhoria para o Supabase, preservando o fluxo Avaliação → Ocorrência → Plano → Ação → Responsável → Prazo → Resultado, com isolamento por cartório. A Etapa 10 não será iniciada.

## Implementação
1. Reforçar a tabela existente `planos_melhoria`, sem recriá-la: adicionar somente autoria, encerramento e chave idempotente; manter os campos, FKs compostas e índices já existentes.
2. Substituir as permissões amplas por policies tenant-scoped e operações autenticadas para criação e atualização. O servidor derivará `cartorio_id` da sessão e validará ocorrência, ponto e responsável ativo do mesmo cartório; `ocorrencia_id` ficará imutável.
3. Adicionar validação e auditoria por triggers: impedir alterações incoerentes, exclusão comum, responsável cruzado, conclusão sem resultado e transições inválidas; registrar criação, atribuição, prazo, status, conclusão e mudanças relevantes em `audit_logs`.
4. Usar o ciclo existente `Planejado → Em andamento → Concluído`, com cancelamento permitido a partir de estados não finais. “Atrasado” será indicação visual derivada do prazo, sem mudança automática do status persistido.
5. Criar funções autenticadas para lista paginada, detalhe, criação idempotente e atualização concorrente. A listagem aceitará filtros por status, responsável, período, ocorrência e prazo, ordenada pelos registros mais recentes.
6. Reescrever `/planos-melhoria` com TanStack Query e dados reais: métricas, filtros, paginação, estados de carregamento/vazio/erro/salvamento/sucesso/permissão, formulário e detalhe editável conforme o papel.
7. Conectar “Criar plano de melhoria” no detalhe de uma ocorrência real, preservando a origem. O detalhe do plano mostrará ocorrência, avaliação relacionada quando houver, responsável, prazo, progresso, resultado, autoria e histórico.
8. Aplicar a matriz mínima já usada em Ocorrências: `PLATFORM_ADMIN`, `CARTORIO_ADMIN` e `GESTOR` podem criar, editar, atribuir, alterar status e concluir; `OPERADOR` pode consultar, sem administrar planos.
9. Remover apenas a dependência de mocks da página de Planos de Melhoria. Relatórios e outros módulos ainda não migrados continuarão inalterados.

## Validação
- Criar fixtures temporárias em dois cartórios e testar listagem, paginação, filtros, criação por ocorrência, detalhe, edição, responsável, prazo, progresso, conclusão e cancelamento.
- Testar ocorrência/responsável/plano de outro tenant, usuário inativo, IDs manipulados, campos vazios, prazo inválido, status inválido, conclusão incompleta, duplo clique, concorrência e exclusão bloqueada.
- Executar o fluxo completo avaliação negativa → ocorrência → plano → responsável → ação → conclusão; confirmar relações, resultado, datas e histórico; limpar todas as fixtures.
- Validar TypeScript, build, linter, ausência de segredo no cliente e a interface autenticada em desktop e celular.
- Criar `IMPROVEMENT_PLANS.md`, relatório final e matriz dos 19 itens, classificando a etapa somente pelas evidências obtidas.

## Fora do escopo
Relatórios reais/PDF, notificações, e-mail, WhatsApp, pagamentos, billing, IA, benchmarking, integrações externas, NFC avançado e qualquer item da Etapa 10.
