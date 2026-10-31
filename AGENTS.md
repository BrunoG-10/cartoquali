<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Every module reads and writes real Supabase data through authenticated TanStack server functions and TanStack Query; there is no mock data layer, and new code must not reintroduce one.
- Keep tenant-scoped tables keyed by `cartorio_id` and let RLS derive the tenant from the session; never accept a tenant id from the client.
- Keep external PostgreSQL migrations, demo seeds, and database validation scripts under `database/`; Supabase schema changes live in `supabase/migrations/`.
- Resolve administrative identity and invitations through authenticated server functions.
- Let authenticated Supabase queries enforce tenant isolation through RLS; reserve the admin client for Auth administration after an RLS-scoped authorization check.
- Resolve a user's effective role with `primaryDbRole` from `src/lib/roles.ts`; a user may hold several roles and the most privileged one wins.
- Keep only public values in the versioned `.env`; the Supabase secret key lives in the ignored `.env.local` locally and in Lovable secrets in production.
- Read Stage 5 evaluations and answers through authenticated, paginated server functions; treat persisted evaluations as immutable history and expose contact details only to authorized roles.
- Resolve Stage 6 public surveys by opaque point slug through narrow server functions; submit atomically with server-side relationship validation and idempotency, never exposing evaluation reads.
- Compute Stage 7 dashboard indicators in one authenticated, RLS-scoped database function using America/Sao_Paulo period boundaries; presentation pages never fall back to mock metrics.
- Persist Stage 8 occurrence writes through authenticated RLS-scoped RPCs and database triggers, with immutable origin, ordered status transitions, idempotency and audit history.
- Persist Stage 9 improvement-plan reads and writes through authenticated tenant-scoped server functions, with database-enforced lifecycle, idempotency, optimistic concurrency and audit history.
- Build Stage 10 reports through one authenticated tenant-scoped aggregate and reuse that authorized result for CSV; report pages never read session mocks.
- Manage evaluation points through authenticated tenant-scoped server functions; preserve legacy public slugs, block deletion, and share one canonical URL across link, QR Code and future NFC.
- Keep browser printing as the Stage 10 PDF path; do not add a dedicated PDF dependency without mature server-side support.
- Centralize administrative capabilities in the typed permissions module, mirror them in server authorization and RLS, and never treat hidden navigation as authorization.
- Persist surveys, questions, settings, users, and audit history through authenticated tenant-scoped services.
- Keep optional evaluator contact separate from immutable evaluation content, restrict it to authorized administrators, and exclude it from aggregates and general exports.
- Treat privacy retention as tenant configuration with no automatic deletion until legally and contractually approved periods exist.
- Rate-limit public evaluation submissions by an ephemeral browser-session token, never by network address, so shared registry networks do not block unrelated visitors.
- Provision registries through the persistent eight-step onboarding RPC boundary; keep test evaluations isolated and require a complete checklist before activation.
- Keep the commercial landing page on `/` data-free except for its server-validated lead submission; product visuals must use static illustrative data and never query tenant operations.
- Serve fonts, scripts and images from our own origin (fonts via `@fontsource`); add no third-party scripts, fonts, trackers or analytics, and if one is ever approved, ship it with a consent banner, a privacy-notice update and an explicit CSP change.
- Keep the security headers in `src/server.ts` (CSP limited to `'self'` and the Supabase project, `nosniff`, referrer and permissions policies, `frame-ancestors`) intact; never widen the CSP for convenience.
- Show the Google review invite identically for every rating (no gating, no suggested text, equal-weight "Agora não"), call Places only from the server with `GOOGLE_PLACES_API_KEY`, record clicks once per evaluation through `registrar_clique_google`, and never report clicks per staff member.
- Keep free-text (comment) questions optional end to end; improvement reasons are the fixed `avaliacoes.motivos` codes derived in the database, never a second question.
- Keep `/api/health` free of tenant data and of the service-role key: it checks Supabase with the publishable key and briefly caches the upstream result.
- Every page is `noindex` by default from the root route; only public commercial pages opt in with `indexableMeta` from `src/lib/seo.ts`, and each one also gets a canonical link and an entry in `public/sitemap.xml`.
- Keep `public/sitemap.xml`, `public/llms.txt` and the 1200×630 `public/og-image.png` in step with the commercial pages and with features that really exist.
- Keep `npx eslint src` free of `jsx-a11y` findings; label every form control, give informative images alt text, and build modal windows on `DialogLayer` (Esc closes, focus stays inside and returns to the opener).
- Before each commit run `npx tsc --noEmit`, `npx eslint src` and `npx vitest run`; commit only the task's own files, and keep dry-run or ad-hoc diagnostic SQL out of the repository.
- A push only updates the code: the site changes after Lovable's Publish → Update, and each release is re-checked on the live site against the delivery checklist ("Padrão de Entrega CartoQuali", https://claude.ai/artifact/4kL3TkCozyyB24XY5F71Ts).
