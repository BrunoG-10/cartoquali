import { createFileRoute } from "@tanstack/react-router";
import { PublicEvaluation } from "@/components/cartoquali/public-evaluation";

export const Route = createFileRoute("/avaliar_/$codigo")({
  head: () => ({ meta: [
    { title: "Avalie seu atendimento — CartoQuali" },
    { name: "description", content: "Compartilhe sua experiência sem conta; identificação é opcional somente para retorno." },
    { property: "og:title", content: "Avalie seu atendimento — CartoQuali" },
    { property: "og:description", content: "Sua opinião ajuda o cartório a melhorar continuamente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PublicEvaluationRoute,
});

function PublicEvaluationRoute() {
  const { codigo } = Route.useParams();
  return <PublicEvaluation code={codigo} />;
}