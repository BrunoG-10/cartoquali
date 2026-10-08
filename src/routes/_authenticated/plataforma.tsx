import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { PlatformPage } from "@/components/cartoquali/platform-page";

export const Route = createFileRoute("/_authenticated/plataforma")({
  head: () => ({
    meta: [
      { title: "Painel da plataforma — CartoQuali" },
      { name: "description", content: "Acompanhe o uso de todos os cartórios." },
    ],
  }),
  component: () => (
    <AppShell>
      <PlatformPage />
    </AppShell>
  ),
});
