import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginPage } from "@/components/cartoquali/auth-pages";
export const Route=createFileRoute("/login")({validateSearch:(search)=>z.object({redirect:z.string().optional().catch(undefined)}).parse(search),head:()=>({meta:[{title:"Entrar — CartoQuali"},{name:"description",content:"Acesso administrativo seguro ao CartoQuali."},{property:"og:title",content:"Entrar — CartoQuali"},{property:"og:description",content:"Acesso administrativo seguro ao CartoQuali."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:()=>{const {redirect}=Route.useSearch();return <LoginPage redirect={redirect??"/dashboard"}/>}});
