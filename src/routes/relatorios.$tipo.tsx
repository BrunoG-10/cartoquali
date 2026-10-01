import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";
import { ReportViewer } from "@/components/cartoquali/report-pages";
import type { ReportKind } from "@/types/cartoquali";

const reportKinds: ReportKind[]=["qualidade","satisfacao","avaliacoes","ocorrencias","planos-melhoria","executivo"];
export const Route=createFileRoute("/relatorios/$tipo")({
  beforeLoad:({params})=>{if(!reportKinds.includes(params.tipo as ReportKind))throw notFound();},
  head:({params})=>({meta:[{title:`${reportKinds.includes(params.tipo as ReportKind)?"Relatório gerencial":"Relatório indisponível"} — CartoQuali`},{name:"description",content:"Visualização gerencial dos indicadores de qualidade do CartoQuali."},{property:"og:title",content:"Relatórios gerenciais — CartoQuali"},{property:"og:description",content:"Visualização gerencial dos indicadores de qualidade do CartoQuali."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),
  component:ReportRoute,
});
function ReportRoute(){const {tipo}=Route.useParams();return <AppShell><ReportViewer kind={tipo as ReportKind}/></AppShell>}