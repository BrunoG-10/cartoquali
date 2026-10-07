import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { PointsPage } from "@/components/cartoquali/points-page";
export const Route = createFileRoute("/_authenticated/pontos")({
  head: () => ({
    meta: [
      { title: "QR Code do cartório — CartoQuali" },
      { name: "description", content: "QR Code único para coletar avaliações do atendimento." },
      { property: "og:title", content: "QR Code do cartório — CartoQuali" },
      {
        property: "og:description",
        content: "QR Code único para coletar avaliações do atendimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <PointsPage />
    </AppShell>
  ),
});
