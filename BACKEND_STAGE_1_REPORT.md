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
- 19 chaves estrangeiras, incluindo vínculos compostos de tenant.
- Campos obrigatórios e valores padrão.
- Unicidade para CNPJ, e-mail por cartório, código/slug por cartório, ordem de pergunta/opção e resposta por avaliação/pergunta.
- Checks para estados, papéis, tipos, dimensões, nota, resolução, prioridade, progresso, consentimento de contato, datas e indicadores.

## 5. Migrations criadas

Uma migration transacional e reproduzível: `database/migrations/20261002175000_create_cartoquali_schema.sql`.

## 6. Dados DEMO inseridos

O seed idempotente define 1 cartório, 3 usuários e papéis, 3 pontos, 1 pesquisa, 5 perguntas, 5 opções, 3 avaliações, 4 respostas, 2 ocorrências e 2 planos. Todos são fictícios e identificados como DEMO/TESTE.

## 7. Testes executados

- Inspeção estática do catálogo esperado, UUIDs, timestamps, FKs, checks, grants e índices.
- Validação do frontend existente por TypeScript e compilação.
- A execução transacional do SQL contra o banco externo não ocorreu porque a conexão administrativa não está vinculada ao projeto.

## 8. Testes aprovados

- Correspondência das 12 tabelas e dos campos mínimos do briefing.
- Presença de relações, índices, constraints e grants na migration.
- Compatibilidade conceitual `registryId` → `cartorio_id` com os tipos atuais.
- Frontend preservado no provedor mock em memória.

## 9. Testes reprovados

Nenhum teste executado foi reprovado. Os testes remotos estão pendentes, não reprovados.

## 10. Problemas encontrados

- O endereço do projeto externo identifica o destino, mas não fornece autorização para criar ou consultar tabelas.
- Não existe conexão externa disponível nesta sessão.
- A pasta reservada de migrations conectadas não aceita gravação manual sem o executor do banco; por isso os artefatos reproduzíveis ficam temporariamente em `database/`.

## 11. Ajustes realizados

- Papéis foram separados de `usuarios` em `user_roles`.
- Relações compostas foram adicionadas para impedir referências entre tenants.
- Campos já presentes no domínio — configurações da pesquisa, condição da pergunta, ponto/dimensão/evidências do plano — foram contemplados sem criar novas entidades fora do escopo.
- Acesso de `anon` e `authenticated` foi revogado enquanto RLS permanece fora desta etapa.

## 12. Pendências

- Conectar o projeto externo em **Configurações do projeto → Integrações → Supabase**.
- Aplicar a migration pelo executor conectado, preservando o histórico.
- Executar `database/seed.sql` e `database/tests/001_schema_validation.sql` no banco conectado.
- Registrar os resultados remotos e, se todos passarem, alterar a classificação para APROVADA.

## Classificação

**APROVADA COM RESSALVAS**

A modelagem e os artefatos de validação estão prontos, mas a estrutura ainda não foi aplicada nem testada no banco externo. A Etapa 2 não foi iniciada.