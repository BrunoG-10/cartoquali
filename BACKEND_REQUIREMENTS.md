# Requisitos para o backend futuro

Este documento é somente uma especificação. Nenhum backend faz parte do MVP atual.

## Autenticação e autorização

- Autenticação real de usuários administrativos.
- Sessão vinculada a usuário e cartório.
- Permissões verificadas no servidor por perfil e operação.
- Recuperação de acesso e encerramento seguro de sessão.

## Multi-tenancy e segurança

- `registryId` obrigatório em entidades, consultas e mutações.
- Políticas de isolamento que impeçam acesso cruzado entre cartórios.
- Validação server-side, limites de requisição e proteção contra abuso no formulário público.
- Criptografia em trânsito e em repouso; segredos fora do cliente.
- Retenção, anonimização e exclusão de dados conforme política LGPD.

## Persistência

Entidades mínimas: cartórios, usuários, perfis, permissões, pesquisas, perguntas, dimensões, categorias, pontos, avaliações, respostas, contatos consentidos, ocorrências, históricos, planos, evidências, configurações e eventos de auditoria.

## API

A API deve implementar os contratos de `CartoQualiService`, sempre recebendo ou derivando o cartório autorizado. Deve oferecer paginação, filtros por período e relacionamentos, respostas tipadas e erros em português apropriados à interface.

## Auditoria e operação

Registrar autor, cartório, ação, entidade, data e metadados não sensíveis. Prever observabilidade, backups, restauração, ambientes separados e testes de autorização multi-tenant antes da produção.
