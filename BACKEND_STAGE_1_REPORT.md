# Relatório técnico — Backend Etapa 1

## 1. Tabelas criadas

Foram definidas 12 tabelas: `cartorios`, `usuarios`, `user_roles`, `pontos_avaliacao`, `pesquisas`, `perguntas`, `opcoes_resposta`, `avaliacoes`, `respostas`, `ocorrencias_qualidade`, `planos_melhoria` e `audit_logs`.

## 2. Relacionamentos criados

- Cartório → usuários, pesquisas, pontos, avaliações, ocorrências, planos e auditoria.
- Usuário → papéis; usuário → responsabilidade por ocorrência/plano.
- Pesquisa → perguntas → opções.
- Cartório + pesquisa → pontos.
- Cartório + ponto + pesquisa → avaliações → respostas.
- Avaliação → ocorrência → plano.
- Chaves compostas impedem vínculos operacionais entre cartórios diferentes.

## 3. Índices criados

Foram definidos 23 índices explícitos para tenant, status, datas e chaves de consulta frequente. Índices implícitos de PK/UNIQUE complementam esses acessos.

## 4. Constraints criadas

- 12 chaves primárias UUID.
- 21 chaves estrangeiras, incluindo vínculos compostos de tenant.
- Campos obrigatórios e valores padrão.
- Unicidade para CNPJ, e-mail por cartório, código/slug por cartório, ordem de pergunta/opção e resposta por avaliação/pergunta.
- Checks para estados, papéis, tipos, dimensões, nota, resolução, prioridade, progresso, consentimento de contato, datas e indicadores.

## 5. Migrations criadas

Uma migration transacional e reproduzível: `database/migrations/20261002175000_create_cartoquali_schema.sql`.

## 6. Dados DEMO inseridos

O seed idempotente define 1 cartório, 3 usuários e papéis, 3 pontos, 1 pesquisa, 5 perguntas, 5 opções, 3 avaliações, 4 respostas, 2 ocorrências e 2 planos. Todos são fictícios e identificados como DEMO/TESTE.

## 7. Testes executados

- Inspeção remota das 12 tabelas, UUIDs, timestamps, 21 FKs, checks, grants, 23 índices e 12 políticas de bloqueio.
- Validação do encadeamento Cartório → Pesquisa/Ponto → Avaliação → Resposta → Ocorrência → Plano.
- Seis testes negativos transacionais: ponto sem cartório, avaliação sem cartório, resposta sem avaliação, pergunta sem pesquisa, progresso acima de 100 e status inválido.
- Confirmação de rollback: nenhum registro temporário da validação permaneceu salvo.
- Validação do frontend existente por TypeScript e compilação.

## 8. Testes aprovados

- Correspondência das 12 tabelas e dos campos mínimos do briefing.
- Presença de relações, índices, constraints e grants na migration.
- Compatibilidade conceitual `registryId` → `cartorio_id` com os tipos atuais.
- Frontend preservado no provedor mock em memória.
- Migration aplicada com sucesso no projeto externo `pztxfbeghbzqvglkancj`.
- Seed confirmado com 1 cartório, 3 usuários, 3 papéis, 3 pontos, 1 pesquisa, 5 perguntas, 5 opções, 3 avaliações, 4 respostas, 2 ocorrências e 2 planos.
- Todos os seis cenários inválidos foram rejeitados pelas constraints esperadas.
- RLS habilitada nas 12 tabelas; `anon` e `authenticated` sem acesso, `service_role` com acesso.

## 9. Testes reprovados

Nenhum teste foi reprovado.

## 10. Problemas encontrados

- A primeira versão deixava RLS desabilitada. Na aplicação remota, RLS foi habilitada com políticas de bloqueio total para clientes, preservando o escopo sem autenticação.
- A referência opcional a `auth.users` foi removida de `usuarios.auth_user_id`; a associação futura será introduzida somente na etapa de autenticação, sem modificar o esquema reservado nesta etapa.

## 11. Ajustes realizados

- Papéis foram separados de `usuarios` em `user_roles`.
- Relações compostas foram adicionadas para impedir referências entre tenants.
- Campos já presentes no domínio — configurações da pesquisa, condição da pergunta, ponto/dimensão/evidências do plano — foram contemplados sem criar novas entidades fora do escopo.
- Acesso de `anon` e `authenticated` foi revogado enquanto RLS permanece fora desta etapa.
- RLS de bloqueio foi habilitada como proteção estrutural mínima; políticas funcionais por usuário e cartório continuam fora desta etapa.

## 12. Pendências

- Implementar autenticação e políticas funcionais por usuário/cartório somente na Etapa 2, quando solicitada.
- Substituir o provedor mock pela API em etapa futura; nenhuma leitura ou escrita do frontend foi ativada agora.

## Classificação

**APROVADA**

A estrutura, os dados DEMO e os testes foram aplicados e validados no banco externo conectado. A Etapa 2 não foi iniciada e o frontend permanece integralmente nos mocks em memória.