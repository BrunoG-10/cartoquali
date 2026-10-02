# Requisitos para o backend futuro

Este documento é somente uma especificação. Nenhum backend faz parte do MVP atual.

## Autenticação e autorização

- Autenticação real de usuários administrativos, com credenciais protegidas, recuperação de acesso e segundo fator quando exigido.
- Sessão vinculada a usuário e cartório por associação persistida e validada em toda requisição.
- Permissões verificadas no servidor por perfil e operação.
- Recuperação de acesso e encerramento seguro de sessão.

## Multi-tenancy e segurança

- `registryId` obrigatório em entidades, consultas e mutações.
- Políticas de isolamento que impeçam acesso cruzado entre cartórios.
- Validação server-side, limites de requisição e proteção contra abuso no formulário público.
- Criptografia em trânsito e em repouso; segredos fora do cliente.
- Retenção, anonimização e exclusão de dados conforme política LGPD.
- Proteção de sessão, expiração e renovação segura de tokens, HTTPS obrigatório e políticas de acesso testáveis.

## Persistência

Entidades mínimas: cartórios, usuários, perfis, permissões, pesquisas, perguntas, dimensões, categorias, pontos, avaliações, respostas, contatos consentidos, ocorrências, históricos, planos, evidências, configurações e eventos de auditoria.

Relação principal obrigatória: `Cartório → Pontos → Pesquisas → Avaliações → Respostas → Ocorrências → Planos`. Chaves estrangeiras e regras de exclusão devem preservar a rastreabilidade; toda entidade operacional deve carregar ou derivar o cartório proprietário.

## API

A API deve implementar os contratos de `CartoQualiService`, sempre recebendo ou derivando o cartório autorizado. Deve oferecer paginação, filtros por período e relacionamentos, respostas tipadas e erros em português apropriados à interface.

O recebimento público de avaliações deve funcionar sem login, validar cartório/ponto/pesquisa, aceitar contato somente com consentimento e aplicar rate limiting, proteção contra automação e validação de payload. Dados pessoais devem ter acesso restrito e nunca aparecer em listagens gerais.

## Auditoria e operação

Registrar autor, cartório, ação, entidade, data e metadados não sensíveis. Prever observabilidade, backups, restauração, ambientes separados e testes de autorização multi-tenant antes da produção.

Indicadores e relatórios devem reproduzir as fórmulas compartilhadas documentadas no frontend e oferecer filtros equivalentes, sem recalcular definições divergentes no transporte.
