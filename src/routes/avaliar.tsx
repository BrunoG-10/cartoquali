import { createFileRoute } from "@tanstack/react-router";
import { PublicEvaluation } from "@/components/cartoquali/public-evaluation";

export const Route = createFileRoute("/avaliar")({
  head: () => ({ meta: [
    { title: "Avaliação pública — CartoQuali" },
    { name: "description", content: "Acesse a avaliação pelo link ou QR Code do ponto de atendimento." },
    { property: "og:title", content: "Avaliação pública — CartoQuali" },
    { property: "og:description", content: "Avalie seu atendimento de forma rápida e anônima." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PublicEvaluation,
});
