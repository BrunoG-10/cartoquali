import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { ImprovementPlansPage } from "@/components/cartoquali/improvement-plans-page";
export const Route = createFileRoute("/_authenticated/planos-melhoria")({
  head: () => ({
    meta: [
      { title: "Planos de melhoria — CartoQuali" },
      { name: "description", content: "Acompanhe ações de melhoria do cartório." },
      { property: "og:title", content: "Planos de melhoria — CartoQuali" },
      { property: "og:description", content: "Acompanhe ações de melhoria do cartório." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <ImprovementPlansPage />
    </AppShell>
  ),
});
