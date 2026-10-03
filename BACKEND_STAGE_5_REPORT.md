# Relatório — Etapa 5: Avaliações e respostas reais

## Resultado

**ETAPA 5 — APROVADA**

## Estrutura utilizada

- `avaliacoes`, ligada ao cartório, ponto e pesquisa.
- `respostas`, ligada à avaliação e pergunta.
- `perguntas` e `opcoes_resposta`, para interpretar os valores exibidos.
- `pontos_avaliacao` e `pesquisas`, para nomes e filtros.
- `usuarios` e `user_roles`, para restringir contato a administradores e gestores.

## Funcionalidades conectadas

- Listagem autenticada e isolada por cartório.
- Ordenação por avaliações mais recentes e paginação de dez itens.
- Filtros por comentário, período, ponto, pesquisa, nota, classificação e status.
- Detalhe com nota, classificação, status, pesquisa, resolutividade, respostas, comentário e motivo de insatisfação.
- Contato omitido da listagem e restrito no detalhe conforme o papel.
- Estados de carregamento, vazio, erro e registro inexistente.

## Segurança e histórico

- Nenhum acesso anônimo ou endpoint público foi criado.
- O RLS deriva o cartório da sessão; a interface não envia um cartório confiável.
- A chave privilegiada não participa da listagem ou dos detalhes.
- Avaliações e respostas podem ser consultadas e criadas no próprio tenant, mas não alteradas ou excluídas por usuários administrativos.

## Matriz real de dois tenants

| Teste | Tenant A | Tenant B | Resultado |
|---|---|---|---|
| Listar próprias avaliações | APROVADO | APROVADO | APROVADO |
| Bloquear avaliações de outro tenant | APROVADO | APROVADO | APROVADO |
| Visualizar respostas próprias | APROVADO | APROVADO | APROVADO |
| Bloquear respostas de outro tenant | APROVADO | APROVADO | APROVADO |
| Criar avaliação de teste | APROVADO | APROVADO | APROVADO |
| Criar resposta | APROVADO | APROVADO | APROVADO |
| Bloquear pesquisa de outro tenant | APROVADO | APROVADO | APROVADO |
| Bloquear ponto de outro tenant | APROVADO | APROVADO | APROVADO |
| Persistência após nova autenticação | APROVADO | APROVADO | APROVADO |
| Paginação e filtros | APROVADO | APROVADO | APROVADO |

Também foram aprovados o bloqueio de resposta cruzada e a imutabilidade por atualização/exclusão. A matriz total foi **12/12**, e todas as fixtures temporárias foram removidas.

## Mocks e limitação

A página administrativa de Avaliações não lê mais o adaptador mock. Os mocks permanecem nos painéis, relatórios e fluxo público porque esses módulos estão fora desta etapa. O banco não possui snapshot histórico do texto das perguntas e opções; o detalhe usa a configuração atual da pesquisa.

O verificador do Supabase mantém um aviso preexistente: proteção contra senhas vazadas desativada.