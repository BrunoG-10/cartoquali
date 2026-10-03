import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";

export const Route=createFileRoute("/_authenticated/relatorios")({head:()=>({meta:[{title:"Relatórios — CartoQuali"},{name:"description",content:"Relatórios gerenciais de qualidade, satisfação, avaliações, ocorrências e melhorias."},{property:"og:title",content:"Relatórios — CartoQuali"},{property:"og:description",content:"Relatórios gerenciais de qualidade do CartoQuali."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:()=> <AppShell><Outlet/></AppShell>});
