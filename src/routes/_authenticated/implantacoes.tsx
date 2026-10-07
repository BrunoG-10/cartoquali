import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { OnboardingPage } from "@/components/cartoquali/onboarding-page";

export const Route = createFileRoute("/_authenticated/implantacoes")({
  head: () => ({
    meta: [
      { title: "Implantações — CartoQuali" },
      { name: "description", content: "Cadastre, teste e ative novos cartórios." },
    ],
  }),
  component: () => (
    <AppShell>
      <OnboardingPage />
    </AppShell>
  ),
});
