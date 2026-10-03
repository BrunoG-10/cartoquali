# Etapa 3 — validação final em 6 blocos

## Objetivo
Confrontar a implementação multi-tenant já aplicada com o novo roteiro, executar cada bloco na ordem exigida e somente manter a etapa como aprovada se todos os testes diretos passarem.

## Estado confirmado
- As 12 tabelas públicas têm RLS ativa e 43 policies separadas por operação.
- O tenant é derivado de `auth.uid()` pelas três funções `SECURITY DEFINER` do schema privado `cartoquali_private`, todas com `search_path` vazio.
- `anon` não possui policies; `audit_logs` possui somente leitura por tenant.
- Há índices para resolução do usuário e para as principais colunas e relações de tenant.
- A chave privilegiada aparece apenas no módulo de servidor; não está em componentes ou hooks.
- As fixtures temporárias anteriores foram removidas.
- A validação anterior aprovou 61 testes, mas o novo relatório exige resultados explícitos por bloco e uma matriz CRUD mais detalhada por entidade.

## Execução sequencial

### Bloco 1 — inspeção e contexto do tenant
- Registrar schema, chaves estrangeiras, vínculo real `auth.users.id → usuarios.auth_user_id`, RLS, policies, funções e privilégios.
- Testar diretamente: usuário válido, usuário sem perfil/cartório e visitante.
- Confirmar que a função não aceita `cartorio_id`, retorna `NULL` sem tenant e não causa recursão.
- Corrigir e repetir antes de avançar, se necessário.

### Bloco 2 — cartórios, usuários e papéis
- Criar tenants A e B e contas Auth temporárias.
- Validar leitura própria e cruzada nos dois sentidos.
- Testar alteração de `cartorio_id`, exclusão de cartório, mutações administrativas por usuário comum e tentativa de autoelevação para `PLATFORM_ADMIN`/`CARTORIO_ADMIN`.
- Preservar a restrição de mutações de usuários e papéis a `CARTORIO_ADMIN` do próprio tenant.

### Bloco 3 — pesquisas, pontos, perguntas e opções
- Executar SELECT, INSERT, UPDATE e DELETE próprios e cruzados para cada entidade.
- Atacar relações indiretas pesquisa → pergunta → opção e tentar trocar/vincular pais entre tenants.
- Corrigir qualquer policy ou índice insuficiente e repetir todo o bloco.

### Bloco 4 — avaliações, respostas e qualidade
- Criar as cadeias completas de A e B.
- Executar a matriz CRUD em avaliações, respostas, ocorrências e planos.
- Testar relações cruzadas, troca de tenant e responsáveis de outro cartório.
- Manter avaliações públicas fechadas para `anon` nesta etapa.

### Bloco 5 — auditoria e usuários especiais
- Confirmar leitura de auditoria apenas no próprio tenant e bloqueio de INSERT, UPDATE e DELETE pelo cliente.
- Revalidar usuário sem perfil, usuário inativo, usuário comum e visitante.
- Revisar toda ocorrência de `service_role` e impedir exposição pública.
- Manter `PLATFORM_ADMIN` sem acesso global até existir uma regra explícita.

### Bloco 6 — penetração, performance e aprovação
- Repetir a matriz completa com sessões reais dos dois tenants e IDs conhecidos, sem depender da interface.
- Cobrir manipulação de payload e parâmetros, acesso direto por ID e todas as cadeias relacionais.
- Revisar índices das colunas usadas pelas policies, planos de consulta e sinais de recursão.
- Remover todas as contas e linhas temporárias e confirmar zero resíduos.
- Rodar linter, validação TypeScript, compilação e uma verificação visual da entrada administrativa.

## Entregáveis
- Atualizar `SECURITY.md` e `DATABASE_SCHEMA.md` somente com resultados comprovados.
- Reestruturar `BACKEND_STAGE_3_REPORT.md` com status, testes e resultado de cada um dos seis blocos; incluir policies, funções, índices, falhas, correções, limitações e vulnerabilidades.
- Atualizar `roadmap.md` conforme o resultado real.
- Classificar como **APROVADA**, **APROVADA COM RESSALVAS** ou **REPROVADA**.

## Limites
- Não iniciar a Etapa 4 nem migrar módulos operacionais dos mocks para o Supabase.
- Não abrir avaliação pública, acesso global de `PLATFORM_ADMIN` ou acesso amplo de `anon`.
- Não expor a chave privilegiada e não confiar em tenant enviado pelo cliente.
