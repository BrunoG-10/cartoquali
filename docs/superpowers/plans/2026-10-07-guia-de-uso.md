# Guia de uso (tour guiado) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tour completo obrigatório (adiável) no primeiro login, guia por página em todas as telas e botão "?" no topo, sobre as telas reais.

**Architecture:** Conteúdo e regras puras em `src/lib/guide/` (testados), progresso por usuário numa tabela nova com RPC `security definer`, orquestrador React no `AppShell` usando `driver.js` para o destaque e o TanStack Router para trocar de tela; alvos marcados com `data-tour`.

**Tech Stack:** TanStack Start (React 19), Supabase (PostgreSQL + RLS + RPC), driver.js 1.x, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-07-guia-de-uso-design.md`

## Global Constraints

- Textos da seção 5 da spec copiados literalmente; tom em pt-BR simples.
- Tour completo = telas dos grupos Acompanhar, Agir e Coletar, filtradas por `can(role, módulo)`.
- "Continuar depois" grava a etapa; reabre no próximo login até `concluido_em` preenchido; `concluido_em` nunca volta a nulo.
- O tour não executa ações (não salva, não envia, não apaga).
- Única dependência nova: `driver.js`. Nenhum armazenamento em navegador para o progresso.
- Migração apenas aditiva, validada com dry run (BEGIN … `raise exception 'DRY_RUN_OK…'`) no SQL Editor antes do merge.
- Animações respeitam `prefers-reduced-motion`. Layout sem rolagem horizontal em 375 px.
- Commits com `git commit -F <arquivo>` quando a mensagem tiver aspas; nunca commitar `src/routeTree.gen.ts`.

## Review Focus

1. **Alvo ausente** (lista vazia, perfil sem o botão): balão centralizado sem destaque, sem travar — teste em Task 2 (`resolveTarget` com seletor inexistente) e verificação no navegador (Task 5).
2. **Recarregar a página no meio do tour**: retoma pela etapa salva na abertura "Bem-vindo de volta" — teste `resumeIndex` (Task 2) + navegador (Task 5).
3. **Perfil Operador**: roteiro sem Pesquisas/QR Code e contagem "Etapa X de Y" coerente — teste `buildTour("operator")` (Task 2).
4. **Usuário clica num link do menu durante o tour**: o tour fecha como "Continuar depois" (grava etapa), sem ficar órfão — verificação no navegador (Task 5).
5. **Falha de rede ao gravar progresso**: o tour segue na tela; erro só em `console.warn`, sem toast bloqueante — revisão de código no Task 4.

---

### Task 0: Preparação

- [ ] Branch `feat/guia-de-uso` a partir de `origin/main` com a spec mesclada (merge local de `origin/docs/spec-guia-de-uso`).
- [ ] `& "C:\Program Files\nodejs\npm.cmd" install driver.js@^1`. Expected: `package.json` e o lockfile do projeto atualizados com `driver.js`.
- [ ] Commit "chore: adiciona driver.js".

### Task 1: Banco — progresso do tour

**Files:**
- Create: `supabase/migrations/20261009010000_guia_progresso.sql`
- Create: `database/tests/003_guia_progresso_asserts.sql`

**Interfaces — Produces:**
- Tabela `public.guia_progresso(usuario_id uuid PK FK usuarios(id) on delete cascade, etapa int not null default 0 check (etapa >= 0), concluido_em timestamptz, updated_at timestamptz not null default now())`; RLS ligada; policy `select` onde `usuario_id = cartoquali_private.current_user_id()`; sem policies de escrita; grants `select` a `authenticated`.
- `public.save_my_guide_progress(_etapa int, _concluido boolean default false) returns jsonb` — `security definer`, `set search_path = public`, erro `forbidden` se `current_user_id()` nulo; upsert da própria linha; `concluido_em = coalesce(concluido_em, case when _concluido then now() end)`; retorna `{step, completedAt}`; grant execute a `authenticated`; revoke de `public, anon`.

- [ ] **Step 1: asserts** em `003_guia_progresso_asserts.sql` (simula sessão com `set local role authenticated` + `set local request.jwt.claims` do admin DEMO `d92c734a-9305-4b68-b7cc-67419eb52337`): (a) salvar etapa 3 → linha com etapa 3 e `concluido_em` nulo; (b) salvar concluído → `concluido_em` preenchido; (c) salvar etapa 1 sem concluir depois → `concluido_em` continua preenchido; (d) `insert` direto na tabela como `authenticated` falha; (e) com claims de outro usuário do DEMO, `select` não retorna a linha do admin; termina com `raise exception 'DRY_RUN_OK: guia_progresso'`.
- [ ] **Step 2:** escrever a migração.
- [ ] **Step 3:** montar `.superpowers/sdd/<plano>/dry-run.sql` = `begin;` + migração + asserts. **Pedir ao usuário** para rodar no SQL Editor. Expected: `DRY_RUN_OK`.
- [ ] **Step 4:** commit.

### Task 2: Conteúdo e regras puras

**Files:**
- Create: `src/lib/guide/content.ts`, `src/lib/guide/plan.ts`, `src/lib/guide/plan.test.ts`

**Interfaces — Produces:**
```ts
export type GuidePage = { path: string; label: string; module: AppModule; group: "acompanhar" | "agir" | "coletar" | "admin" };
export type GuideStep = { page: string /* path */; target: string /* data-tour id */; title: string; text: string };
export const GUIDE_PAGES: readonly GuidePage[];       // todas as telas da área logada
export const TOUR_STEPS: readonly GuideStep[];        // 17 balões da spec §5, na ordem
export const PAGE_GUIDES: Record<string, readonly GuideStep[]>; // por path, spec §6 (3–6 balões)
export function buildTour(role: UserRole | null): GuideStep[];  // filtra TOUR_STEPS por can(role, page.module)
export function resumeIndex(savedStep: number, total: number): number; // clamp 0..total-1
export function progressLabel(steps: GuideStep[], index: number): string; // "Etapa 3 de 9 · Avaliações" (conta telas, não balões)
export function pageGuide(path: string, role: UserRole | null): GuideStep[]; // [] se não houver ou sem permissão
export function resolveTarget(target: string, doc?: Document): Element | null; // document.querySelector(`[data-tour="${target}"]`)
```

- [ ] **Step 1: testes** em `plan.test.ts`: `buildTour("registry_admin")` tem 17 passos e começa em `/dashboard`; `buildTour("operator")` não contém `/pesquisas` nem `/pontos`; `progressLabel(buildTour("registry_admin"), 5)` === `"Etapa 3 de 9 · Avaliações"`; `resumeIndex(99, 17)` === 16 e `resumeIndex(-1, 17)` === 0; `pageGuide("/cartorio", "operator")` === `[]`; `pageGuide("/cartorio", "registry_admin").length` entre 3 e 6; todo path em `PAGE_GUIDES` existe em `GUIDE_PAGES`; `resolveTarget("inexistente", document)` === `null` (ambiente `happy-dom`/`jsdom` se já configurado; senão passar um objeto com `querySelector` falso).
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar (textos §5 literais; §6 escritos no mesmo tom). **Step 4:** rodar → PASS. **Step 5:** commit.

### Task 3: Servidor e contexto de autenticação

**Files:**
- Create: `src/lib/guide.functions.ts`
- Modify: `src/lib/auth.functions.ts`, `src/components/cartoquali/auth-provider.tsx`

**Interfaces — Produces:**
- `getCurrentAuthContext` (status active) devolve também `guide: { step: number; completedAt: string | null } | null` (lido de `guia_progresso` via `untypedDb`; linha ausente = `{ step: 0, completedAt: null }`; **erro de leitura = `null`**, e com `null` o tour não abre sozinho — evita forçar o tour em quem já concluiu se a tabela ainda não existir ou a consulta falhar).
- `saveGuideProgress({ step: number int >= 0, completed?: boolean })` → chama RPC `save_my_guide_progress` com `rpc.bind`; retorna `{ step, completedAt }`.
- `useAuth()` expõe `guide` e `setGuide(next)` (atualização local otimista).

- [ ] **Step 1:** implementar; `tsc` → 0. **Step 2:** commit.

### Task 4: Orquestrador, abertura, final e botão "?"

**Files:**
- Create: `src/components/cartoquali/guide/guide-provider.tsx`, `guide-welcome.tsx`, `guide-finish.tsx`, `guide-button.tsx`, `src/components/cartoquali/app-topbar.tsx`
- Modify: `src/components/cartoquali/app-shell.tsx`, `src/styles.css`, telas com `data-tour` (dashboard, quality-dashboard, reviews-page, report-pages, occurrences-page, improvement-plans-page, surveys-page, points-page, registry-page, users-page, settings-page, privacy-requests-page, audit-page, onboarding-page, app-shell nav)
- Test: `src/lib/guide/targets.test.ts`

**Interfaces — Consumes:** Task 2 (`buildTour`, `pageGuide`, `progressLabel`, `resumeIndex`, `resolveTarget`), Task 3 (`guide`, `setGuide`, `saveGuideProgress`).
**Produces:** `useGuide(): { startTour(opts?: { fromStart?: boolean }): void; startPageGuide(): void; hasPageGuide: boolean; running: boolean }`.

- [ ] **Step 1: teste** `targets.test.ts`: para todo `target` em `TOUR_STEPS` e `PAGE_GUIDES`, existe a string `data-tour="<target>"` em algum `.tsx` de `src/components` (varredura de arquivos). Rodar → FAIL.
- [ ] **Step 2:** adicionar os `data-tour` nas telas (sem mudar comportamento). Rodar → PASS.
- [ ] **Step 3:** `GuideProvider` no `AppShell`: abre a abertura automaticamente quando `status === "authenticated"` e `guide.completedAt === null` (uma vez por sessão de página); estados `welcome → tour(index) → finish`; para cada passo: navega para `step.page` se diferente, espera `resolveTarget` até 4 s (poll 100 ms), chama `driver.highlight({ element | undefined, popover: { title, description, side: "bottom", align: "start", showButtons: ["previous","next","close"], progressText, nextBtnText: "Próximo", prevBtnText: "Voltar", doneBtnText: "Concluir", onNextClick, onPrevClick, onCloseClick } })`; "close"/Esc = "Continuar depois" → `saveGuideProgress({ step: index })` (falha só `console.warn`); fim → `saveGuideProgress({ step: total, completed: true })` → tela final. Clique em link do menu durante o tour → trata como "Continuar depois" (assinar mudança de `pathname` não iniciada pelo tour). Guia de página: mesmo motor, sem gravar progresso.
- [ ] **Step 4:** `GuideWelcome` (Dialog em tela cheia, reaproveita a cena de `auth-scene.tsx` — extrair `AuthScene` reutilizável se preciso) com variantes primeiro acesso / retomada; `GuideFinish` com telas ✓ e selo dourado animado.
- [ ] **Step 5:** `AppTopbar` (computador, `hidden lg:flex`, título da tela a partir de `GUIDE_PAGES`) + `GuideButton` (DropdownMenu shadcn: "Guia desta página" / "Tour completo do sistema"); no celular, `GuideButton` na barra móvel existente.
- [ ] **Step 6:** tema do driver em `styles.css` (`.cq-guide-popover`: fundo branco, título Source Serif, barra de progresso dourada, botões da marca; overlay azul-marinho 70%); `@media (prefers-reduced-motion)` desliga animações do driver (`animate: false` também via matchMedia).
- [ ] **Step 7:** `tsc`, `vitest`, build → verdes. Commit.

### Task 5: Verificação, PR e banco

- [ ] **Step 0:** antes do merge, verificar no localhost o que não depende do banco novo: abertura via "?" → "Tour completo", tour inteiro, guias de página, topbar, 375 px, alvo ausente. Com a tabela ainda inexistente, a abertura automática não deve ocorrer (guide = null). A gravação/retomada (abaixo) só é verificável depois que a migração for aplicada.
- [ ] **Step 1 (navegador, localhost logado, após migração aplicada):** primeiro acesso (sem linha em `guia_progresso` — o próprio usuário admin) → abertura → percorrer tour inteiro em 1280 px → final; recarregar no meio → "Bem-vindo de volta" retoma; "Continuar depois" fecha; "?" → "Guia desta página" em Cartório e Pesquisas; "Tour completo" pelo "?" após concluir; 375 px sem rolagem horizontal; alvo ausente (Avaliações filtrada sem resultados) mostra balão centralizado. **Atenção:** os testes gravam o progresso do próprio usuário admin em produção — avisar o usuário antes e, ao final, oferecer zerar a linha (com aprovação).
- [ ] **Step 2:** PR `feat: guia de uso (tour guiado)`; CI verde; **pedir dry run** (Task 1) se ainda não rodado; merge **com aprovação**; conferir que a migração foi aplicada (RPC responde); usuário publica na Lovable.
