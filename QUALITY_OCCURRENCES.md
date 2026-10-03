# Ocorrências de Qualidade

## Modelo e origem
As ocorrências são persistidas em `public.ocorrencias_qualidade`. Cada registro pertence a um cartório e pode manter vínculos com uma avaliação e um ponto do mesmo cartório. A origem da avaliação não pode ser alterada depois da criação.

## Criação
Usuários autenticados e ativos podem criar uma ocorrência manual ou a partir do detalhe de uma avaliação real. O servidor deriva o cartório da sessão, valida os vínculos e usa uma chave de requisição para impedir duplicidade em reenvios.

## Responsável
O responsável é opcional na abertura, mas, quando informado, precisa ser um usuário ativo do mesmo cartório. A resolução exige responsável definido.

## Status e tratamento
O fluxo permitido é `Nova → Em análise → Em tratamento → Resolvida → Encerrada`. Permanecer no estado atual é aceito; saltos e retrocessos são rejeitados no banco. Resolver exige observação de tratamento, e a data de resolução é registrada automaticamente.

## Permissões
- `PLATFORM_ADMIN`, `CARTORIO_ADMIN` e `GESTOR`: consultar, criar, editar, atribuir, avançar status e encerrar.
- `OPERADOR`: consultar e criar; não pode editar, atribuir, resolver ou encerrar.

## Auditoria
Criações e alterações relevantes são registradas em `public.audit_logs`, incluindo usuário, data e valores anteriores e novos. O histórico é somente leitura para clientes; inserção, alteração e exclusão direta são bloqueadas.

## RLS e isolamento por cartório
Listagens, detalhes e alterações usam a sessão autenticada e as políticas RLS. O cliente não escolhe `cartorio_id`. Avaliação, ponto, responsável e ocorrência são conferidos contra o cartório da sessão no servidor e no banco. Acesso cruzado entre cartórios retorna nenhum registro ou erro, conforme a operação.

## Interface
A página `/ocorrencias` usa dados reais, paginação recente primeiro e filtros por status, prioridade, categoria, responsável, avaliação e período. Ela inclui estados de carregamento, vazio, erro, salvamento e sucesso, além de detalhe, histórico e criação vinculada a uma avaliação.

## Integridade
Ocorrências não são excluídas pelo fluxo comum. Atualizações usam a versão `updated_at` esperada para detectar concorrência. Avaliações históricas continuam imutáveis e não são modificadas durante o tratamento da ocorrência.