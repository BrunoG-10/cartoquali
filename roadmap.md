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
