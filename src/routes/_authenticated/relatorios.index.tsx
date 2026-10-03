import { createFileRoute } from "@tanstack/react-router";
import { ReportsCatalog } from "@/components/cartoquali/report-pages";

export const Route=createFileRoute("/_authenticated/relatorios/")({
  head:()=>({meta:[{title:"Relatórios — CartoQuali"},{name:"description",content:"Escolha relatórios gerenciais de qualidade, satisfação, avaliações e melhoria contínua."},{property:"og:title",content:"Relatórios — CartoQuali"},{property:"og:description",content:"Escolha relatórios gerenciais de qualidade, satisfação, avaliações e melhoria contínua."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),
  component:ReportsCatalog,
});