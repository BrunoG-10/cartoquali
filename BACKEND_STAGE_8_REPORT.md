# Relatório — Etapa 8

## Classificação
APROVADA.

## Implementado
O módulo de Ocorrências passou a listar, filtrar, paginar, criar, detalhar e tratar registros reais do Supabase. A criação pode partir de uma avaliação real, o responsável é validado no mesmo cartório e o histórico permanece imutável.

## Banco de dados
- Funções `public.create_quality_occurrence` e `public.update_quality_occurrence` ajustadas para `SECURITY INVOKER`.
- Policies `ocorrencias_insert_own_tenant` e `ocorrencias_update_own_tenant` adicionadas, com grants mínimos para `authenticated` e `service_role`.
- Trigger privado de validação de vínculos, responsável e transições de status.
- Trigger privado de auditoria após criação e atualização.
- Auditoria persistida em `public.audit_logs`, sem escrita direta por clientes.

## Aplicação
- Funções autenticadas para listagem, detalhe, criação e atualização.
- Lista real com filtros e paginação de 10 registros.
- Formulário manual e pré-preenchimento a partir do detalhe da avaliação.
- Detalhe com avaliação de origem, tratamento e histórico.
- Edição restrita aos papéis autorizados e invalidação dos dados após mutações.

## Testes executados
- Matriz de dados com dois cartórios e três usuários: **21/21 aprovada**.
- Casos cobertos: acesso não autenticado, criação manual, idempotência, criação por avaliação, vínculos cruzados, permissões do operador, transições, concorrência, resolução, isolamento, auditoria e fluxo completo.
- TypeScript: aprovado.
- Build do aplicativo: aprovado.
- Linter de segurança: sem novos problemas; permanece apenas o aviso preexistente de proteção contra senhas vazadas desativada.
- Navegador autenticado: desktop 1280×1800 e celular 390×844 aprovados, sem rolagem horizontal, sem erros de console e com formulário funcional.
- Fixtures temporárias removidas após os testes.

## Problemas encontrados e corrigidos
- Funções de escrita privilegiadas foram substituídas por execução como usuário autenticado, preservando RLS.
- As políticas foram reforçadas para impedir relações com avaliação, ponto ou responsável de outro cartório.
- Saltos de status, resolução sem tratamento, repetição da solicitação e atualização concorrente foram bloqueados.
- O teste visual foi corrigido para restaurar a sessão no domínio local; o Supabase externo não oferece injeção automática neste ambiente.

## Matriz final
| Item | Status | Evidência |
|---|---|---|
| Listagem real | APROVADO | consulta autenticada e paginada no Supabase |
| Criação manual | APROVADO | criação persistida e validada |
| Criação pela avaliação | APROVADO | vínculo real e atalho no detalhe |
| Detalhe | APROVADO | dados, origem, tratamento e histórico |
| Edição | APROVADO | atualização persistida com concorrência otimista |
| Responsável | APROVADO | somente usuário ativo do mesmo cartório |
| Status | APROVADO | sequência obrigatória validada no banco |
| Encerramento | APROVADO | resolução e encerramento testados |
| Histórico | APROVADO | trigger e escrita direta bloqueada |
| Relação com avaliação | APROVADO | origem preservada e vínculo cruzado negado |
| Multi-tenant | APROVADO | matriz com dois cartórios |
| RLS | APROVADO | leitura e escrita sob sessão autenticada |
| Permissões | APROVADO | gestor administra; operador cria, mas não edita |
| Validação server-side | APROVADO | vínculos, campos, status e concorrência |
| Estados da interface | APROVADO | loading, vazio, erro, salvando e sucesso |
| Remoção dos mocks | APROVADO | página de ocorrências sem dependência do provedor mock |
| Performance | APROVADO | paginação, projeções e filtros no banco |
| Teste end-to-end | APROVADO | avaliação → ocorrência → responsável → tratamento → resolução |
| Documentação | APROVADO | `QUALITY_OCCURRENCES.md` e este relatório |

## Ressalva preexistente
A proteção contra senhas vazadas continua desativada no projeto Supabase. O alerta não foi introduzido por esta etapa.

## Escopo
A Etapa 9 não foi iniciada. Planos de melhoria continuam fora desta migração.