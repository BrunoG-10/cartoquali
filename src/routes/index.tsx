import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "CartoQuali — Gestão de qualidade" },
      { name: "description", content: "Acesso administrativo ao CartoQuali." },
      { property: "og:title", content: "CartoQuali — Gestão de qualidade" },
      { property: "og:description", content: "Acesso administrativo ao CartoQuali." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
