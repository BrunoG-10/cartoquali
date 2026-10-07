# QR Code único, atribuições e perguntas essenciais — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um QR Code por cartório, pergunta opcional de serviço montada a partir das atribuições da serventia, e seis perguntas essenciais protegidas.

**Architecture:** Migrações aditivas no Supabase (catálogo global de serviços, serviços por cartório, colunas novas em `cartorios`, `avaliacoes` e `perguntas`, triggers de proteção e RPCs), funções de servidor TanStack que expõem isso com tipos, e ajustes de UI nas telas existentes. Nada é removido; links e avaliações antigas continuam válidos.

**Tech Stack:** TanStack Start (React 19), Supabase (PostgreSQL + RLS + RPC), Zod, TanStack Query, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-07-qr-unico-atribuicoes-design.md`

## Global Constraints

- Migrações apenas aditivas; nenhuma avaliação existente é alterada; nenhum `ponto_avaliacao` é apagado.
- Atribuições: `notas`, `protesto`, `imoveis`, `rtd_pj`, `civil_pn`, `maritimo`, `distribuicao` (rótulos e serviços da seção 5 da spec, copiados literalmente).
- Chaves essenciais: `overall`, `courtesy`, `clarity`, `time`, `structure`, `resolution`, com textos, tipos, dimensões e obrigatoriedade da seção 7 da spec.
- Toda escrita de atribuições/serviços passa por RPC que exige `PLATFORM_ADMIN` ou `CARTORIO_ADMIN` e deriva o cartório da sessão; RLS de leitura por cartório.
- Avaliação pública: serviço opcional ("Outro serviço" grava `servico_outro=true`; "Pular" grava ambos vazios/false).
- Textos em pt-BR; textos comerciais citam Lei 13.460, CNJ (Provimento 229/2026) e PQTA sem afirmar conformidade legal; aviso de independência mantido.
- Cada PR: `tsc`, `vitest`, build e verificação no navegador antes do merge; migrações testadas antes com o script de dry run (BEGIN … ROLLBACK) no SQL Editor.
- Commits com `git commit -F <arquivo>` (PowerShell 5.1); git em `C:\Users\Bruno Gabriel\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd`.

## Review Focus

1. **Cartório sem atribuições** (todos os existentes após a migração): a avaliação pública não mostra a tela de serviço e o envio funciona sem `serviceId` — teste no Task 3 (dry run) e no Task 6 (`shouldShowServiceStep([])`).
2. **Atribuição desmarcada depois de haver avaliações**: o painel continua mostrando o nome do serviço dessas avaliações — teste no Task 3 (dry run: desmarcar e conferir `services` no `get_dashboard_indicators`).
3. **Um único serviço ativo**: a tela não aparece e o serviço é gravado automaticamente — teste no Task 6 (`resolveServiceStep` com 1 serviço).
4. **Chamada direta à API tentando desativar/apagar essencial ou criar `chave_essencial`**: bloqueada no banco — teste no Task 2 (dry run).
5. **QR antigo de ponto desativado** (DEMO `CQ-REC-001`): continua respondendo "ponto inativo", sem erro — verificação no Task 9.

---

### Task 0: Pré-requisito

- [ ] **Step 1:** Com aprovação do usuário, mesclar o PR #11 (Prettier) na `main` (`gh pr merge 11 --merge`) e atualizar a `main` local. Todos os PRs abaixo partem da `main` atualizada.

### Task 1: Catálogo e regras puras (TypeScript)

**Files:**
- Create: `src/lib/attributions.ts`
- Test: `src/lib/attributions.test.ts`

**Interfaces — Produces:**
- `type AttributionKey = "notas" | "protesto" | "imoveis" | "rtd_pj" | "civil_pn" | "maritimo" | "distribuicao"`
- `ATTRIBUTIONS: ReadonlyArray<{ key: AttributionKey; label: string }>` (ordem e rótulos da spec §5)
- `SERVICE_CATALOG: ReadonlyArray<{ key: string; attribution: AttributionKey; name: string; order: number }>` (chaves `notas.reconhecimento_firma`, `notas.autenticacao`, … no padrão `<atribuicao>.<slug>`)
- `type EssentialKey = "overall" | "courtesy" | "clarity" | "time" | "structure" | "resolution"`
- `ESSENTIAL_QUESTIONS: ReadonlyArray<{ key: EssentialKey; order: number; text: string; type: "stars" | "scale" | "yes_no"; dimension: string; required: boolean }>` (spec §7)
- `ESSENTIAL_LABELS: Record<EssentialKey, string>` = Satisfação geral, Cordialidade, Clareza, Tempo, Instalações, Resolutividade

- [ ] **Step 1: Write the failing tests** — `attributions.test.ts`: `ATTRIBUTIONS` tem as 7 chaves na ordem da spec; toda atribuição tem ≥1 serviço em `SERVICE_CATALOG`; chaves do catálogo são únicas e começam com a atribuição; `ESSENTIAL_QUESTIONS` tem 6 itens com ordens 1–6, só `structure` com `required: false`, `resolution` com `type: "yes_no"` e `overall` com `type: "stars"`.
- [ ] **Step 2:** `npm test` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar as constantes em `src/lib/attributions.ts` com os textos literais da spec.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit na branch `feat/qr-unico-banco` ("feat: catalogo de atribuicoes e perguntas essenciais").

### Task 2: Migração de esquema, proteções e RPCs de configuração

**Files:**
- Create: `supabase/migrations/20261008010000_qr_unico_atribuicoes_schema.sql`
- Create: `database/tests/002_qr_unico_dry_run.sql`

**Interfaces — Produces (banco):**
- `cartorios.atribuicoes text[] not null default '{}'` + check `atribuicoes <@ array['notas','protesto','imoveis','rtd_pj','civil_pn','maritimo','distribuicao']`
- `public.catalogo_servicos(chave text pk, atribuicao text not null, nome text not null, ordem int not null)` — seed com os mesmos valores de `SERVICE_CATALOG`; `grant select` a `authenticated`; RLS `using (true)` para select.
- `public.servicos_cartorio(id uuid pk default gen_random_uuid(), cartorio_id uuid not null references cartorios, catalogo_chave text not null references catalogo_servicos, atribuicao text not null, nome text not null, ativo boolean not null default true, ordem int not null, created_at, updated_at, unique(cartorio_id, catalogo_chave))` — RLS select `cartorio_id = cartoquali_private.current_cartorio_id()`; sem policies de escrita.
- `avaliacoes.servico_id uuid null references servicos_cartorio`, `avaliacoes.servico_outro boolean not null default false`, índice `(cartorio_id, servico_id, created_at) where not is_test`.
- `perguntas.chave_essencial text null` + check nos 6 valores + `unique(pesquisa_id, chave_essencial)`.
- Trigger `protect_essential_question` (before update or delete on `perguntas`): erro `essential_question_locked` conforme spec §6; em insert/update com `auth.role() <> 'service_role'`, `new.chave_essencial` deve ser igual a `old.chave_essencial` (ou nulo no insert).
- Trigger `seed_survey_questions` (after insert on `pesquisas`): insere as 6 essenciais + 2 extras (spec §7) com `security definer`.
- `public.set_registry_attributions(_atribuicoes text[]) returns jsonb` e `public.set_registry_service_active(_servico_id uuid, _ativo boolean) returns jsonb` — padrão das RPCs existentes (`security definer`, `search_path` fixo, `has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])`, `insert into audit_logs` com actions `registry_attributions_updated` / `registry_service_toggled`); erros `forbidden`, `attributions_required`, `service_not_found`. Grants: `authenticated`.
- Bloco de migração de pesquisas existentes (spec §6): marcar por dimensão (`service`→`courtesy`), inserir essenciais faltantes, renumerar ordem (essenciais 1–6, extras depois).
- `save_onboarding_survey`: remover os inserts de perguntas do template (o trigger passa a criá-las).

- [ ] **Step 1: Write the dry-run test** `database/tests/002_qr_unico_dry_run.sql`: `begin;` + conteúdo da migração + asserções com `do $$ … raise exception … $$` para: (a) toda pesquisa tem 6 essenciais únicas; (b) update de `ativa=false` numa essencial falha com `essential_question_locked`; (c) update só de `texto` passa; (d) delete de essencial falha; (e) insert de pergunta com `chave_essencial` simulando `authenticated` (`set local role authenticated` + `request.jwt.claims`) falha; (f) nova pesquisa nasce com 8 perguntas; (g) `set_registry_attributions('{}')` falha com `attributions_required`; + `rollback;`.
- [ ] **Step 2:** Pedir ao usuário para rodar o dry run no SQL Editor antes de escrever a migração final → esperado: falha (objetos ainda não existem).
- [ ] **Step 3:** Escrever a migração `20261008010000_…sql` e colar o mesmo conteúdo no dry run.
- [ ] **Step 4:** Usuário roda o dry run → esperado: termina em `ROLLBACK` sem exceções; confirmar com `select count(*) from catalogo_servicos` fora da transação = erro "não existe" (nada persistiu).
- [ ] **Step 5:** Commit ("feat(db): atribuicoes, servicos e perguntas essenciais").

### Task 3: Migração das RPCs de avaliação, painel e relatório

**Files:**
- Create: `supabase/migrations/20261008020000_qr_unico_rpcs.sql`
- Modify: `database/tests/002_qr_unico_dry_run.sql` (acrescentar asserções)

**Interfaces — Consumes:** Task 2. **Produces (banco):**
- `get_public_evaluation_context(_code text)` passa a incluir `registryOfficialName` (razão social), `registryTradeName` e `services: [{id, name, attribution}]` (ativos, de atribuições marcadas, ordenados por atribuição e `ordem`). Mesmo para `get_onboarding_test_context`.
- `submit_public_evaluation(…, _servico_id uuid default null, _servico_outro boolean default false)` — nova assinatura com defaults (manter grants); valida serviço do mesmo cartório, ativo e de atribuição marcada, senão `service_unavailable`; grava as colunas. Se o cartório tiver exatamente 1 serviço ativo e `_servico_id` nulo e `_servico_outro` false, grava esse serviço.
- `get_dashboard_indicators(…, _servico_id uuid default null)` filtra por serviço e devolve `services: [{id, name, total, average, negative_rate}]` com ids especiais `"outro"` e `"nao_informado"`.
- `get_quality_report(…)` inclui `service_name` em cada item de `evaluations`.
- `create_cartorio_onboarding(…, _atribuicoes text[] default '{}')` grava as atribuições e cria os serviços do catálogo (mesma lógica de `set_registry_attributions`, sem exigir sessão do próprio cartório, pois é chamada pelo administrador da plataforma); o wrapper `onboarding_create_cartorio_onboarding` repassa o parâmetro.

- [ ] **Step 1: Acrescentar asserções ao dry run:** cartório sem atribuições → contexto com `services = []` e envio sem serviço funciona; serviço de outro cartório → `service_unavailable`; serviço inativo → `service_unavailable`; com 1 serviço ativo e envio sem serviço → avaliação gravada com esse `servico_id`; desmarcar a atribuição após avaliar → `get_dashboard_indicators` ainda lista o serviço com `total = 1` (Review Focus 2).
- [ ] **Step 2:** Usuário roda → FAIL.
- [ ] **Step 3:** Escrever a migração (redefinindo as 4 funções a partir da versão mais recente de cada uma no repositório).
- [ ] **Step 4:** Usuário roda o dry run completo (Task 2 + Task 3) → termina em `ROLLBACK` sem exceções.
- [ ] **Step 5:** `npm run build` e `tsc` (front ainda compatível, parâmetros novos têm default); commit; abrir PR "feat(db): qr unico e atribuicoes"; CI verde; merge com aprovação; conferir com o usuário `select max(version) from supabase_migrations.schema_migrations` = `20261008020000`.

### Task 4: Funções de servidor

**Files:**
- Modify: `src/lib/registry.functions.ts`, `src/lib/surveys.functions.ts`, `src/lib/public-evaluation.functions.ts`, `src/lib/dashboard-indicators.functions.ts`, `src/lib/evaluations.functions.ts`, `src/lib/quality-reports.functions.ts`, `src/lib/onboarding.functions.ts`, `src/integrations/supabase/types.ts` (só os tipos novos, à mão, no mesmo formato gerado)
- Test: `src/lib/public-evaluation.test.ts`

**Interfaces — Produces:**
- `getMyRegistry` passa a devolver `attributions: AttributionKey[]` e `services: Array<{ id: string; attribution: AttributionKey; name: string; active: boolean }>`.
- `setRegistryAttributions({ attributions: AttributionKey[] })` e `setRegistryServiceActive({ serviceId: string; active: boolean })` (POST, `requireSupabaseAuth`, chamam as RPCs; erros traduzidos).
- `SurveyQuestion` ganha `essentialKey?: EssentialKey` (`src/types/cartoquali.ts`); `saveSurveyQuestion` traduz `essential_question_locked` para "Esta pergunta é essencial: só o texto pode ser alterado."
- `submissionSchema` aceita `serviceId?: uuid` e `serviceOther?: boolean`; `PublicEvaluationContext` (ready) ganha `registryOfficialName: string`, `registryTradeName: string | null`, `services: Array<{ id: string; name: string; attribution: string }>`; `parseContext` trata ausência como `[]`/fallback para `registryName`.
- `getDashboardIndicators` aceita `serviceId?: uuid`; `DashboardIndicatorsData.services: Array<{ id: string; name: string; total: number; average: number | null; negative_rate: number | null }>`.
- `listEvaluations` devolve `serviceName: string | null` por item; CSV ganha a coluna `servico` após `data`.
- `createOnboardingRegistry` aceita `attributions: AttributionKey[]` (min 1) e repassa `_atribuicoes` para `create_cartorio_onboarding` (nova assinatura definida no Task 3).

- [ ] **Step 1: Failing tests** em `public-evaluation.test.ts`: `submissionSchema` aceita `serviceId` UUID e rejeita `"x"`; aceita `serviceOther: true`; `parseContext` de um contexto sem `services` devolve `services: []` e `registryOfficialName` = `registryName`; com `services` válidos devolve a lista.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar as mudanças listadas.
- [ ] **Step 4:** `npm test`, `tsc` → PASS.
- [ ] **Step 5:** Commit na branch `feat/qr-unico-telas` ("feat: funcoes de servidor para atribuicoes e servicos").

### Task 5: Telas de configuração

**Files:**
- Create: `src/components/cartoquali/registry-attributions.tsx`
- Modify: `src/components/cartoquali/registry-page.tsx`, `src/components/cartoquali/surveys-page.tsx`, `src/components/cartoquali/points-page.tsx`, `src/components/cartoquali/point-qr-dialog.tsx`, `src/components/cartoquali/app-shell.tsx` (rótulo "QR Code" no grupo Coletar), `src/components/cartoquali/onboarding-page.tsx`, `src/constants/cartoquali.ts` (rótulo da dimensão `service` = "Cordialidade")

**Interfaces — Consumes:** Task 1 (`ATTRIBUTIONS`, `ESSENTIAL_LABELS`), Task 4.

- [ ] **Step 1:** `RegistryAttributions` (seção "Atribuições e serviços"): 7 caixas; serviços agrupados com `Switch`; administrador edita, demais só leem (`can(role, "registry", "manage")`); aviso ao desmarcar; impede salvar com zero atribuições.
- [ ] **Step 2:** Pesquisas: cadeado + `StatusBadge` "Essencial · {ESSENTIAL_LABELS[key]}"; no `QuestionModal` de essencial, desabilitar tipo, dimensão, obrigatória e ativa com texto explicativo; ocultar botão desativar.
- [ ] **Step 3:** Pontos → "QR Code": título "QR Code do cartório"; mostrar só o ponto principal (ativo único; se vários, o mais antigo); remover "Novo ponto"; cartaz e diálogo de QR exibem razão social em destaque e nome fantasia abaixo.
- [ ] **Step 4:** Onboarding: campo de atribuições (≥1) na etapa de dados do cartório.
- [ ] **Step 5:** Verificação: `tsc`, `npm test`, build; no navegador (logado), marcar/desmarcar atribuições e serviços no DEMO e conferir persistência; abrir uma essencial e confirmar campos travados; tela QR mostra 1 QR e cartaz com razão social; tentar salvar sem atribuições → mensagem de erro. Commit.

### Task 6: Avaliação pública

**Files:**
- Create: `src/lib/service-step.ts`, `src/lib/service-step.test.ts`
- Modify: `src/components/cartoquali/public-evaluation.tsx`, `src/components/cartoquali/survey-questionnaire.tsx` (prévia)

**Interfaces — Produces:**
- `resolveServiceStep(services: Array<{ id: string; name: string; attribution: string }>): { show: false; autoServiceId: string | null } | { show: true; groups: Array<{ attribution: string; label: string; services: Array<{ id: string; name: string }> }> }`

- [ ] **Step 1: Failing tests** em `service-step.test.ts`: `[]` → `{ show: false, autoServiceId: null }`; 1 serviço → `{ show: false, autoServiceId: id }`; 3 serviços de 2 atribuições → `show: true` com 2 grupos na ordem de `ATTRIBUTIONS`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementar. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** UI: cabeçalho com razão social + nome fantasia + "Avaliação do atendimento"; tela "Qual serviço você utilizou hoje?" com botões grandes agrupados, "Outro serviço" e "Pular"; envia `serviceId`/`serviceOther`; prévia em Pesquisas mostra a tela.
- [ ] **Step 6:** Verificação no navegador (375 px): DEMO com 2 atribuições → tela aparece; enviar uma avaliação de teste **somente com aprovação do usuário** (grava no banco de produção) ou usar a prévia; cartório sem atribuições → tela não aparece. Commit.

### Task 7: Painel, avaliações e CSV

**Files:**
- Modify: `src/components/cartoquali/dashboard.tsx`, `src/components/cartoquali/use-real-dashboard.ts`, `src/components/cartoquali/reviews-page.tsx`, `src/components/cartoquali/quality-dashboard.tsx` (rótulo Cordialidade)

- [ ] **Step 1:** Painel: `select` "Todos os serviços" alimentado por `data.services`; `useRealDashboard` repassa `serviceId`; bloco "Desempenho por serviço" substitui "por ponto" (barra de média, total, negativas); itens "Outro serviço" e "Serviço não informado".
- [ ] **Step 2:** Avaliações: coluna "Serviço" (desktop) e linha no cartão (celular); detalhe mostra o serviço.
- [ ] **Step 3:** Verificação: `tsc`, `npm test`, build; painel filtrado por um serviço muda os números; CSV exportado tem a coluna `servico`. Commit; PR "feat: qr unico nas telas"; CI; merge com aprovação; publicar na Lovable.

### Task 8: Página inicial

**Files:**
- Modify: `src/components/cartoquali/landing-page.tsx`, `src/components/cartoquali/landing-visuals.tsx`

- [ ] **Step 1:** Aplicar a spec §11 literalmente: passos 1 e 2 de "Como funciona"; dois blocos em "Indicadores" no lugar da lista de pontos; três referências em "Feito para cartórios" (CNJ/Provimento 229/2026, Lei 13.460/2017, PQTA) + aviso; FAQ ("Preciso de um QR Code para cada setor?" e "Posso personalizar as perguntas?"); "Atendimento" → "Cordialidade" nos mockups.
- [ ] **Step 2:** Verificação: `tsc`, build; conferir textos no navegador (1280 e 375 px), sem rolagem horizontal; 8 seções. Commit; PR "feat: pagina inicial com qr unico e referencias normativas"; CI; merge com aprovação.

### Task 9: DEMO e verificação final

**Files:**
- Create (scratchpad, não versionado): script Node de ajuste do DEMO

- [ ] **Step 1:** Com aprovação do usuário: `set_registry_attributions` equivalente para o DEMO (`notas`, `civil_pn`) via service role; desativar `CQ-REC-001` e `CQ-SAI-001`.
- [ ] **Step 2:** Verificação em `https://cartoquali.com.br`: `/avaliar/CQ-BAL-001` mostra razão social e a tela de serviço com serviços de Notas e Registro Civil; `/avaliar/CQ-REC-001` mostra "ponto inativo" (Review Focus 5); painel (logado) mostra "Desempenho por serviço".
- [ ] **Step 3:** Atualizar `roadmap.md` (seção nova) e marcar a spec como implementada; PR de documentação.
