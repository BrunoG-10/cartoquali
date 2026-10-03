import { createFileRoute } from "@tanstack/react-router";
import { ReportViewer } from "@/components/cartoquali/report-pages";

export const Route = createFileRoute("/_authenticated/visao-executiva")({
  head: () => ({
    meta: [
      { title: "Visão Executiva — CartoQuali" },
      { name: "description", content: "Resumo executivo dos indicadores, pontos de atenção e ações de qualidade do cartório." },
      { property: "og:title", content: "Visão Executiva — CartoQuali" },
      { property: "og:description", content: "Resumo executivo dos indicadores, pontos de atenção e ações de qualidade do cartório." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ReportViewer kind="executivo" />,
});