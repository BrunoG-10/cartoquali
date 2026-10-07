import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/components/cartoquali/auth-pages";
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — CartoQuali" },
      { name: "description", content: "Defina uma nova senha para o CartoQuali." },
      { property: "og:title", content: "Redefinir senha — CartoQuali" },
      { property: "og:description", content: "Defina uma nova senha para o CartoQuali." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});
