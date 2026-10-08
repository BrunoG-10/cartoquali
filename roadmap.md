# CartoQuali v1

- [x] Design system and responsive application shell
- [x] Dashboard and analytics interactions
- [x] Reviews, surveys, evaluation points and detail flows
- [x] Quality, reports, registry, users and settings pages
- [x] Public mobile evaluation journey
- [x] Route metadata and responsive end-to-end validation
- [x] Dynamic point-based public evaluation route
- [x] Conditional evaluation, contact, loading and error journeys
- [x] Session-only submission reflected across admin views
- [x] Evaluation-point actions and visual totem
- [x] End-to-end mobile and desktop validation
- [x] Multi-registry typed domain model and relational mock data
- [x] Replaceable service contract and session-only adapter state
- [x] Derived indicators and global dashboard filters
- [x] Functional quality occurrences and improvement-plan views
- [x] Existing pages connected to the active registry model
- [x] Separate evaluation welcome screen before the five-step survey
- [x] Controlled mock submission failure with retry and success states
- [x] Quality dashboard, global filters and derived indicators
- [x] Quality dimensions, evolution, distribution and point drill-down
- [x] Review-to-occurrence session flow and methodology 1.0
- [x] Responsive desktop/mobile quality validation
- [x] Standardize session context imports and remove the missing-provider runtime error
- [x] Expand typed occurrence and improvement-plan session operations
- [x] Build responsive occurrence list, creation, detail, updates and timeline
- [x] Build improvement-plan creation, progress, completion and results
- [x] Connect Quality management summaries, alerts, recurrence and continuous cycle
- [x] Validate the complete occurrence-to-result flow on desktop and mobile
- [x] Expand relational admin mocks, service contracts and session operations
- [x] Build registry, users and permission administration
- [x] Build survey creation, question editor, conditions and shared preview
- [x] Build evaluation point creation and detail analytics
- [x] Build general settings, categories and quality dimensions
- [x] Derive quality dimensions from configured questions and answers
- [x] Validate all administration flows on desktop and mobile
- [x] Add typed report contracts and shared report service
- [x] Build reports catalog, shared filters and six report views
- [x] Add report evidence, methodology links and print presentation
- [x] Expand deterministic mock coverage and align Dashboard calculations
- [x] Validate report flows, filtering and responsive printing
- [x] Complete registry address, evaluation settings and point descriptions
- [x] Duplicate surveys with independent question copies
- [x] Share the configured questionnaire between public evaluation and administrative preview
- [x] Add the report generator, periods and re-openable report history
- [x] Complete quality, indicators and executive report insights
- [x] Add specialized report filters and improvement evidence
- [x] Validate report consistency, printing and responsive layouts
- [x] Validate mock relationships and tenant isolation
- [x] Align date ranges, evolution series and report filters
- [x] Complete privacy, consent and negative-evaluation UX
- [x] Harden administrative validation and destructive actions
- [x] Standardize interface states and session report history
- [x] Validate the complete MVP flow, accessibility and responsive printing
- [x] Centralize typed service, provider, permission, error and audit contracts
- [x] Remove direct mock imports from presentation and session layers
- [x] Document the future external API and backend boundary
- [x] Validate decoupled flows across the required desktop and mobile views

# Backend — Etapa 1

- [x] Create the external PostgreSQL schema migration
- [x] Add reproducible DEMO seed data
- [x] Add structural, relational, and negative constraint validation SQL
- [x] Document the database model and frontend boundary
- [x] Connect the user-provided external Supabase project without enabling Lovable Cloud
- [x] Apply and validate the migration on the connected external Supabase project

# Backend — Etapa 2

- [x] Add Supabase Auth login, recovery and password-definition flows
- [x] Protect every administrative page and preserve public evaluation routes
- [x] Resolve the signed-in user, registry and role through secured server functions
- [x] Add server-authorized administrative invitations and real access listing
- [x] Send and link the initial registry-administrator invitation
- [x] Add authenticated identity and safe sign-out to the administrative menu
- [x] Validate signed-out protection, invalid login, public access and responsive auth screens
- [ ] Validate invitation acceptance, authenticated persistence, full recovery and logout after the invited administrator defines a password

# Backend — Etapa 3

- [x] Add private current-user and current-registry database helpers
- [x] Replace deny-all policies with tenant-scoped RLS policies and minimum grants
- [x] Execute the two-registry direct-request security matrix and clean test fixtures
- [x] Validate legitimate frontend flows and publish the Stage 3 security report
- [x] Revalidate Stage 3 sequentially across all six requested security blocks

# Backend — Etapa 4

- [x] Inspect the real schema, relationships, RLS policies, grants and administrative mock flows
- [x] Block 1: migrate Registry read/edit to real tenant-scoped Supabase data and validate persistence/security
- [x] Block 2: migrate Users and Auth invitation management
- [x] Block 3: migrate Evaluation Points management
- [ ] Block 4: migrate Surveys, Questions and Answer Options management
- [ ] Remove replaced mocks, validate persistence/responsiveness and publish the Stage 4 report

# Backend — Etapa 5

- [x] Inspect evaluations, answers, relationships, constraints and RLS
- [x] Connect the authenticated evaluation list, filters and pagination to Supabase
- [x] Connect evaluation details and question answers with restricted contact data
- [x] Validate controlled insertion, persistence and complete two-tenant isolation
- [x] Remove replaced evaluation mocks and publish the Stage 5 report

# Backend — Etapa 6

- [x] Audit the real public evaluation schema, routes, policies and questionnaire
- [x] Add narrow public survey loading and transactional submission boundaries
- [x] Connect the mobile public flow to real point, survey, question and option data
- [x] Expose copyable public evaluation links in Evaluation Points
- [ ] Validate the public flow with two real test tenants and visually confirm the new row in the authenticated administration (blocked: only one tenant and no injected authenticated session)
- [x] Remove the public route's dependency on evaluation mocks and publish the Stage 6 report

# Backend — Etapa 7

- [x] Audit every dashboard and quality indicator data path, formula, filter, permission and state
- [x] Add authenticated tenant-scoped real indicator queries with Brazilian timezone period boundaries
- [x] Replace Dashboard and Quality indicator mocks with real Supabase data and real comparisons
- [x] Validate known-data mathematics, filters, roles, tenant isolation, refresh behavior and security
- [x] Validate desktop, tablet and mobile states; remove only replaced mocks and publish the Stage 7 report

# Backend — Etapa 8

- [x] Audit occurrence schema, relationships, RLS, permissions, audit history and current mock flows
- [x] Add authenticated tenant-scoped occurrence commands with idempotency, transition rules and immutable audit history
- [x] Connect paginated occurrence list, filters, detail, creation and treatment to real Supabase data
- [x] Connect creation from a real evaluation and remove only occurrence-page mock dependencies
- [x] Validate roles, two-tenant isolation, integrity, errors, end-to-end treatment and responsive states
- [x] Publish occurrence documentation, the final matrix and confirmation that Stage 9 was not started

# Backend — Etapa 9

- [x] Audit improvement-plan schema, permissions, relationships and mock flows
- [x] Add tenant-scoped plan commands with authorship, idempotency, lifecycle, concurrency and audit history
- [x] Connect paginated plan list, filters, detail, creation, updates and occurrence handoff to real Supabase data
- [x] Validate roles, tenant isolation, integrity, full lifecycle and responsive states
- [x] Publish improvement-plan documentation and the final 19-item validation matrix

# Backend — Etapa 10

- [x] Confirm Stage 9 validation and documentation are complete before finalizing reports
- [x] Audit report mocks, real data sources, permissions, filters and export paths
- [x] Add one authenticated tenant-scoped report aggregation boundary with São Paulo period rules
- [x] Connect consolidated, detailed and executive reports to real Supabase data
- [x] Add authorized CSV export and preserve safe browser printing without fragile PDF generation
- [x] Validate mathematics, filters, two-tenant isolation, roles, privacy, performance and responsive states
- [x] Remove only report mocks and publish Stage 10 documentation and final matrix
- [x] Confirm Stage 11 was not started

# Backend — Etapa 11

- [x] Audit point schema, public routes, RLS, permissions, links and remaining mocks
- [x] Harden tenant-scoped point operations, lifecycle, uniqueness and audit history
- [x] Add canonical public URLs, QR preview/download/print and NFC preparation
- [x] Validate real submission, survey reassignment, activation, roles and two-tenant isolation
- [x] Validate mobile, errors, performance and absence of exposed secrets or internal IDs
- [x] Remove only point mocks and publish Stage 11 documentation and final matrix
- [x] Confirm Stage 12 was not started

# Backend — Etapa 12

- [x] Audit roles, tenant policies, private routes, sessions, user lifecycle, privileged functions and audit coverage
- [x] Centralize the four-role capability matrix and filter administrative navigation
- [x] Block direct role escalation, self-lockout, cross-tenant writes and protected registry-field changes
- [x] Make user creation and role/status updates atomic and server-authorized
- [x] Migrate Surveys, Questions, Answer Options and General Settings from session mocks to real tenant data
- [x] Add immutable, tenant-scoped, paginated audit history with filters
- [x] Revalidate inactive users on focus and periodically during long-lived sessions
- [x] Pass the 12/12 direct role, tenant, stale-session and immutable-audit matrix; remove all fixtures
- [x] Publish Stage 12 security and audit documentation without starting a later stage

# Backend — Etapa 13

- [x] Audit personal data, public collection, restricted contact, exports, browser storage and privacy language
- [x] Separate optional contact from evaluations and restrict access to authorized administrators
- [x] Add tenant-scoped privacy requests, minimization and privacy-event auditing
- [x] Add public privacy notice, operational terms and contextual notices in the evaluation journey
- [x] Add configurable privacy channel and nullable retention settings without automatic deletion
- [x] Validate public submissions, roles, two-tenant isolation, exports, minimization and responsive states
- [x] Publish Stage 13 documentation and final 31-item matrix without starting a later stage

# Backend — Etapa 14

- [x] Audit the complete public evaluation route, server boundary, database validation, QR URL and mobile states
- [x] Harden resilience, accessibility, payload limits, cache behavior and shared-network abuse protection
- [x] Validate two-tenant integrity, manipulated payloads, retry/idempotency, dynamic survey and point reactivation
- [x] Validate 320–430 px layouts, performance, XSS-safe rendering and QR production URL behavior
- [x] Remove only public-flow leftovers and publish Stage 14 documentation and final matrix
- [x] Confirm the onboarding stage was not started

Status: **APROVADA COM RESSALVAS OPERACIONAIS**. A origem HTTPS de produção ainda precisa ser definida em `VITE_PUBLIC_APP_URL`; a sessão autenticada do Supabase externo não estava disponível para uma inspeção visual administrativa. A Etapa 15 não foi iniciada.

# Backend — Etapa 15

- [x] Criar fluxo guiado e persistente de oito etapas para provisionamento do cartório
- [x] Convidar administrador com papel limitado ao tenant e compensação em falha
- [x] Criar pesquisa modelo, validar perguntas, publicar e vincular ponto com QR automático
- [x] Isolar avaliação de teste dos dados operacionais e bloquear ativação incompleta
- [x] Permitir ativação, desativação e reativação auditadas
- [x] Identificar ambientes DEMO e manter novos onboardings como dados reais isolados
- [x] Adicionar checklist operacional, guia contextual e documentação da implantação
- [x] Validar contratos TypeScript, segurança do banco e matriz técnica da Etapa 15

Status: **APROVADA COM RESSALVAS OPERACIONAIS**. Matriz A–H concluída com 16 verificações aprovadas e limpeza integral dos dados temporários. A origem HTTPS definitiva ainda precisa ser configurada em `VITE_PUBLIC_APP_URL`; o envio real do convite depende de e-mail institucional válido e a entrega física do QR depende da implantação local. A proteção contra senhas vazadas permanece desativada no provedor de autenticação. A Etapa 16 não foi iniciada.

# Landing page comercial

- [x] Substituir o redirecionamento inicial por uma landing page comercial pública em `/`
- [x] Criar representações estáticas e fiéis do produto sem consultar dados privados
- [x] Implementar navegação, seções comerciais, objeções e CTAs para demonstração
- [x] Implementar formulário de lead separado das avaliações, com validação, proteção e persistência segura
- [x] Revisar copy, SEO, acessibilidade, performance e segurança
- [x] Validar conversão e responsividade em desktop, tablet e 320/360/390/430 px
- [x] Documentar integrações, testes, pendências e classificação final sem iniciar outra etapa

Status: **VALIDADA COM RESSALVAS OPERACIONAIS**. O formulário persiste contatos comerciais de forma isolada no Supabase externo, mas notificações e integração com CRM/WhatsApp permanecem pendentes. Os mockups e números são explicitamente ilustrativos, sem uso de dados privados. A proteção contra senhas vazadas continua desativada no provedor de autenticação, condição preexistente e não causada pela landing page.

## WhatsApp comercial da landing page

- [x] Direcionar CTAs, contato e formulário para o WhatsApp (86) 98184-6766
- [x] Validar abertura da conversa no celular e desktop

# Revisão técnica e visual — outubro de 2026

Desenvolvimento passou a ser feito via Claude Code, com o GitHub como fonte oficial e PRs para a `main`.

## Correções e segurança

- [x] Papel efetivo do usuário com vários papéis (`primaryDbRole` em `src/lib/roles.ts`) no login e na listagem (PRs #1)
- [x] Rollback correto na criação de usuário (PR #1)
- [x] Administrador da plataforma protegido na tela de usuários e na função `update_registry_user` (PR #4, migração `20261007010000`)
- [x] Domínio de produção `cartoquali.com.br` em `VITE_PUBLIC_APP_URL` para links e QR Codes (PR #1)
- [x] Camada de dados mock removida; `AGENTS.md` e `ARCHITECTURE.md` atualizados (PR #3)
- [x] 22 testes automatizados (Vitest) e verificação automática no GitHub Actions (PR #2)

## Revisão visual

- [x] Identidade "selo de conformidade": logo, ícones, paleta institucional e títulos em serifa (PR #5)
- [x] Menu lateral agrupado; botão "Sair" sempre acessível, inclusive no celular (PR #6)
- [x] Página inicial reduzida de 18 para 8 seções, com contexto do PQTA/ANOREG e aviso de independência (PR #7)
- [x] Painel com comparação ao período anterior e gráficos nas cores da marca; menu fixo ao rolar (PR #8)
- [x] Avaliação pública destacando o cartório (PR #9)
- [x] Dados do DEMO: avaliações de testes marcadas como `is_test`; textos de pesquisa e pontos realistas

## QR Code único e serviços (PRs #11–#12)

- [x] Formatação geral com Prettier (PR #11, mesclado junto com o #12)
- [x] Um QR Code por cartório; cartaz com razão social e nome fantasia
- [x] Atribuições da serventia (Lei 8.935/94, art. 5º) e serviços configuráveis; pergunta opcional "Qual serviço você utilizou hoje?"
- [x] Seis perguntas essenciais protegidas no banco; perguntas próprias livres
- [x] Painel, lista de avaliações e CSV por serviço; página inicial citando CNJ (Prov. 229/2026), Lei 13.460/2017 e PQTA

## Experiência, correções e guia (PRs #13–#19)

- [x] Login com cena animada do QR Code (PR #13)
- [x] Redefinição de senha liberada pela sessão do link (PR #14)
- [x] Navegação mais fluida: guarda de rota local e rechecagens silenciosas (PR #15)
- [x] Varredura de botões: imprimir com filtros, CSV, ocorrências, cartaz, permissões e menus (PR #16)
- [x] Guia de uso: tour no primeiro login, guia por página e botão "?" (PR #17; tabela `guia_progresso`)
- [x] Ajustes menores: texto neutro, Auditoria em português, nome do CSV, QR inativo (PR #18)
- [x] Convite pela tela Implantações e links de e-mail pelo endereço oficial; roteiro do Supabase Auth em `docs/operacao/configuracao-supabase-auth.md` (PR #19)
- [x] Layout em tela cheia sem bordas vazias; revisão em 360, 768, 1024, 1440, 1920 e 2560 px; foco visível e alvos de toque (PR #20)
- [x] Pergunta de melhoria com texto livre no "Outro" e opção "Nada a melhorar" (PR #21)

## Pendências para o MVP

Dependem de configuração ou decisão do responsável:

- [ ] Troca da secret key do Supabase (também nos secrets da Lovable) — ver roteiro, passo 6
- [ ] Supabase Auth: URLs de redirecionamento, cadastro aberto desligado, SMTP com `cartoquali@gmail.com` e e-mails em português — ver roteiro
- [ ] Validação de ponta a ponta: convite, primeiro acesso, avaliação real no painel e logout
- [ ] Primeira implantação real (segundo cartório) para validar isolamento e fluxo de implantação
- [ ] Privacidade e Termos: identificação da empresa e canal de privacidade
- [ ] Plano do Supabase (Pro recomendado: sem pausa por inatividade e com backups)
- [ ] Captcha (Cloudflare Turnstile) na avaliação pública — aguarda chaves
- [ ] Monitoramento de erros (ex.: Sentry) — aguarda conta
- [x] Remover o plano de teste antigo `STAGE9_TEST_e182a0f5` do DEMO (removido em 08/10/2026)

Pós-MVP:

- [ ] Filtro por serviço nos relatórios (exige migração da função `get_quality_report`)
- [ ] Notificação e CRM para contatos comerciais
