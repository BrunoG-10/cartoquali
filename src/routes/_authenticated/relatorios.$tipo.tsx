import { createFileRoute, notFound } from "@tanstack/react-router";
import { ReportViewer } from "@/components/cartoquali/report-pages";
import type { ReportKind } from "@/types/cartoquali";

const reportKinds: ReportKind[] = [
  "qualidade",
  "indicadores",
  "satisfacao",
  "avaliacoes",
  "ocorrencias",
  "planos-melhoria",
  "executivo",
];
export const Route = createFileRoute("/_authenticated/relatorios/$tipo")({
  beforeLoad: ({ params }) => {
    if (!reportKinds.find((kind) => kind === params.tipo)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `${reportKinds.find((kind) => kind === params.tipo) ? "Relatório gerencial" : "Relatório indisponível"} — CartoQuali`,
      },
      {
        name: "description",
        content: "Visualização gerencial dos indicadores de qualidade do CartoQuali.",
      },
      { property: "og:title", content: "Relatórios gerenciais — CartoQuali" },
      {
        property: "og:description",
        content: "Visualização gerencial dos indicadores de qualidade do CartoQuali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportRoute,
});
function ReportRoute() {
  const { tipo } = Route.useParams();
  const kind = reportKinds.find((item) => item === tipo);
  if (!kind) return null;
  return <ReportViewer kind={kind} />;
}
