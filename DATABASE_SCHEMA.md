# Estrutura do banco do CartoQuali — Etapa 1

## Escopo

O PostgreSQL externo prepara a persistência real do CartoQuali. Nesta etapa, o frontend continua exclusivamente no provedor mock em memória. Não há autenticação, RLS, API ou leitura/escrita do frontend.

`registryId`, usado no domínio TypeScript, corresponde a `cartorio_id` no banco.

## Diagrama lógico

```text
Cartórios ─┬─ Usuários ─ Papéis
           ├─ Pesquisas ─ Perguntas ─ Opções de resposta
           └─ Pontos de avaliação ─ Avaliações ─ Respostas
                                      └─ Ocorrências ─ Planos de melhoria
Cartórios ─ Auditoria
```

## Dicionário de dados

| Tabela | Finalidade | Campos principais e tipos | Obrigatoriedade e relações | Regras relevantes |
|---|---|---|---|---|
| `cartorios` | Tenant institucional | `id uuid`, dados cadastrais `text`, `data_renovacao date`, timestamps | Razões sociais, CNPJ, tipo, cidade, UF, responsável, status e plano obrigatórios | CNPJ único; UF com 2 caracteres; status controlado |
| `usuarios` | Perfil administrativo futuro | `id uuid`, `auth_user_id uuid`, nome/e-mail/telefone, status, timestamps | `cartorio_id` obrigatório; `auth_user_id` opcional referencia `auth.users` | E-mail único por cartório; papel não fica nesta tabela |
| `user_roles` | Papéis separados do perfil | `id uuid`, `role text`, timestamp | `user_id` obrigatório → usuários | Um papel por usuário; quatro valores previstos; não concede acesso nesta etapa |
| `pesquisas` | Questionários versionados | `id uuid`, textos, versão, `configuracoes jsonb`, timestamps | `cartorio_id` obrigatório | Status ativa/rascunho/inativa; identidade composta para isolamento |
| `pontos_avaliacao` | Origem física/lógica da avaliação | `id uuid`, código, slug, localização, método, timestamps | Cartório e pesquisa obrigatórios | Código e slug únicos por cartório; pesquisa deve ser do mesmo cartório |
| `perguntas` | Estrutura de questionário | `id uuid`, texto, tipo, ordem, flags, dimensão, `condicao jsonb`, timestamps | `pesquisa_id` obrigatório | Tipo/dimensão controlados; ordem positiva e única por pesquisa |
| `opcoes_resposta` | Alternativas de escolha | `id uuid`, texto, valor, ordem, timestamp | `pergunta_id` obrigatório | Ordem positiva e única por pergunta |
| `avaliacoes` | Resposta pública agregada | `id uuid`, nota, resolução, comentários, contato, anonimato, status, timestamp | Cartório, ponto e pesquisa obrigatórios | Nota 1–5; trio deve pertencer ao mesmo contexto; contato exige consentimento e não anonimato |
| `respostas` | Respostas por pergunta | `id uuid`, `valor jsonb`, texto livre, timestamp | Avaliação e pergunta obrigatórias | Uma resposta por pergunta/avaliação; ao menos um valor preenchido |
| `ocorrencias_qualidade` | Tratamento de problemas | `id uuid`, categoria, prioridade, status, datas, textos | Cartório obrigatório; avaliação, ponto e responsável opcionais | Relações opcionais devem ser do mesmo cartório; datas e enums validados |
| `planos_melhoria` | Ação ligada à ocorrência | `id uuid`, textos, prazo, progresso, indicadores, timestamps | Cartório e ocorrência obrigatórios; ponto/responsável opcionais | Progresso 0/25/50/75/100; relações no mesmo cartório; indicadores 0–100 |
| `audit_logs` | Base para auditoria futura | `id uuid`, ação, entidade, `entity_id uuid`, `metadata jsonb`, timestamp | Cartório obrigatório; usuário opcional | Sem gatilhos ou gravação automática nesta etapa |

## Integridade, índices e acesso

- UUIDs usam `gen_random_uuid()`; datas de evento usam `timestamptz` com `now()`.
- Exclusões destrutivas de entidades operacionais são restritas. Papéis, perguntas, opções e respostas dependentes usam cascata quando o filho perde significado sem o pai.
- Índices cobrem tenant, datas de avaliações/auditoria, status e chaves de pesquisa, ponto, avaliação, pergunta e responsável.
- RLS está habilitada nas 12 tabelas com políticas explícitas de bloqueio para `anon` e `authenticated`; somente `service_role` pode acessar os dados até a etapa de autenticação e políticas funcionais.

## Artefatos reproduzíveis

- Estrutura: `database/migrations/20261002175000_create_cartoquali_schema.sql`
- Dados fictícios: `database/seed.sql`
- Validação transacional: `database/tests/001_schema_validation.sql`

A estrutura foi aplicada no projeto Supabase externo conectado pelo executor de migrations. A cópia em `database/migrations` permanece como artefato reproduzível e documentação da Etapa 1; o frontend continua sem consumir essas tabelas.
