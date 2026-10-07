import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { OccurrencesPage } from "@/components/cartoquali/occurrences-page";

export const Route = createFileRoute("/_authenticated/ocorrencias")({
  head: () => ({
    meta: [
      { title: "Ocorrências de Qualidade — CartoQuali" },
      {
        name: "description",
        content: "Registre e acompanhe ocorrências de qualidade do cartório.",
      },
      { property: "og:title", content: "Ocorrências de Qualidade — CartoQuali" },
      {
        property: "og:description",
        content: "Registre e acompanhe ocorrências de qualidade do cartório.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <OccurrencesPage />
    </AppShell>
  ),
});
