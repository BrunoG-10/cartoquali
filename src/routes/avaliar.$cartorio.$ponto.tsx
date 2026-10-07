import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/avaliar/$cartorio/$ponto")({
  head: () => ({
    meta: [
      { title: "Avalie seu atendimento — CartoQuali" },
      {
        name: "description",
        content: "Avaliação rápida e anônima do atendimento no Cartório Modelo.",
      },
      { property: "og:title", content: "Avalie seu atendimento — CartoQuali" },
      {
        property: "og:description",
        content: "Compartilhe sua experiência de forma rápida e anônima.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DynamicEvaluation,
});

function DynamicEvaluation() {
  const { ponto } = Route.useParams();
  return <Navigate to="/avaliar/$codigo" params={{ codigo: ponto }} replace />;
}
