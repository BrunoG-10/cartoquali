import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { PrivacyRequestsPage } from "@/components/cartoquali/privacy-requests-page";

export const Route = createFileRoute("/_authenticated/solicitacoes-privacidade")({
  head: () => ({
    meta: [
      { title: "Solicitações de privacidade — CartoQuali" },
      {
        name: "description",
        content: "Tratamento administrativo de solicitações de privacidade no CartoQuali.",
      },
      { property: "og:title", content: "Solicitações de privacidade — CartoQuali" },
      {
        property: "og:description",
        content: "Tratamento administrativo de solicitações de privacidade no CartoQuali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <PrivacyRequestsPage />
    </AppShell>
  ),
});
