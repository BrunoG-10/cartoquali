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

- Keep CartoQuali presentation components dependent on typed service contracts and mock adapters, so a future external API can replace mock data without rebuilding the UI.
- Keep demo submissions in a shared in-memory session provider; never persist them in browser storage or a database during the MVP.
- Keep tenant-scoped entities keyed by `registryId` and filter every presentation read through the active registry, so future API isolation can replace mock selection safely.
- Keep analytics as pure functions over typed reviews, outside presentation components, so backend-derived metrics can replace them without UI changes.
- Keep occurrence and improvement-plan mutations inside the shared session provider behind typed service-shaped operations, so presentation code never edits mock collections directly.
- Keep all administrative mutations inside the shared session provider and derive quality dimensions through answer-to-question mappings, so mock configuration and future external adapters remain interchangeable.
- Build all report view models through the typed report service from session-scoped domain data and shared analytics, so future exports or external APIs never fork indicator logic.
- Validate relational mock fixtures with a development-only health check, so broken tenant links fail before they reach presentation flows.
- Resolve all runtime data through the typed data-provider boundary; only the provider adapter may import mock fixtures.
