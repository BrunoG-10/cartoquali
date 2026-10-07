import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AlertCircle, Building2, ClipboardList, FileBarChart, Gauge, Menu, MessageSquareText, Settings, ShieldCheck, Users, X, MapPin, ExternalLink, ListChecks, BriefcaseBusiness, LogOut, ScrollText, UserRoundCheck, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/cartoquali/auth-provider";
import { LogoMark, Wordmark } from "@/components/cartoquali/logo";
import { USER_ROLE_LABELS } from "@/constants/cartoquali";
import { can, type AppModule } from "@/lib/permissions";

const nav = [
  ["/dashboard", "Dashboard", Gauge,"dashboard"], ["/implantacoes", "Implantações", Rocket,"onboarding"], ["/avaliacoes", "Avaliações", MessageSquareText,"evaluations"], ["/pesquisas", "Pesquisas", ClipboardList,"surveys"], ["/pontos", "Pontos de avaliação", MapPin,"points"], ["/qualidade", "Qualidade", ShieldCheck,"quality"], ["/ocorrencias", "Ocorrências", AlertCircle,"occurrences"], ["/planos-melhoria", "Planos de melhoria", ListChecks,"plans"], ["/relatorios", "Relatórios", FileBarChart,"reports"], ["/visao-executiva", "Visão Executiva", BriefcaseBusiness,"reports"], ["/cartorio", "Cartório", Building2,"registry"], ["/usuarios", "Usuários", Users,"users"], ["/configuracoes", "Configurações", Settings,"settings"], ["/solicitacoes-privacidade", "Privacidade", UserRoundCheck,"privacy"], ["/auditoria", "Auditoria", ScrollText,"audit"],
] as const;

function Brand() { return <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><LogoMark size={38} /><span><Wordmark className="block text-lg leading-none" /><small className="text-xs text-muted-foreground">Gestão de qualidade</small></span></Link>; }

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const {currentRole}=useAuth(); const allowed=nav.filter((item)=>can(currentRole,item[3] as AppModule));
  return <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Navegação principal">
    <p className="px-3 pb-2 text-[10px] font-semibold uppercase text-muted-foreground">Principal</p>
    {allowed.map(([to,label,Icon], index) => <div key={to}>{index > 0 && allowed[index-1]?.[3]!=="registry" && to==="/cartorio" && <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase text-muted-foreground">Administração</p>}<Link to={to} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-glass-strong hover:text-foreground", pathname === to && "bg-glass-strong font-semibold text-primary shadow-sm")}><Icon className="size-4" />{label}</Link></div>)}
  </nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usuario, cartorio, currentRole, signOut } = useAuth();
  return <div className="relative min-h-screen overflow-x-hidden bg-background">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(circle_at_5%_5%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_30%),radial-gradient(circle_at_95%_30%,color-mix(in_oklab,var(--accent)_60%,transparent),transparent_30%)]" />
    <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-glass-border bg-glass p-5 backdrop-blur-xl lg:flex"><Brand/><Navigation/><div className="rounded-lg border border-glass-border bg-glass p-3"><p className="truncate text-xs font-semibold">{usuario?.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{cartorio?.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{currentRole?USER_ROLE_LABELS[currentRole]:""}</p><Button className="mt-3 w-full justify-start" size="sm" variant="ghost" onClick={()=>void signOut()}><LogOut/>Sair</Button></div></aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Fechar menu" className="absolute inset-0 bg-foreground/20" onClick={() => setMobileOpen(false)} /><aside className="relative flex h-full w-[280px] flex-col border-r border-glass-border bg-background p-5 shadow-xl"><div className="flex items-center justify-between"><Brand/><Button variant="ghost" size="icon" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><X/></Button></div><Navigation onNavigate={() => setMobileOpen(false)} /></aside></div>}
      <div className="min-w-0 flex-1"><div className="sticky top-0 z-30 flex items-center justify-between border-b border-glass-border bg-glass px-4 py-3 backdrop-blur-xl lg:hidden"><Button variant="ghost" size="icon" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu /></Button><Brand/><Link to="/avaliar" aria-label="Abrir avaliação pública" className="grid size-9 place-items-center rounded-md text-primary hover:bg-glass"><ExternalLink className="size-4" /></Link></div><main className="p-4 sm:p-6 lg:p-8">{children}<p className="mt-8 text-center text-[11px] text-muted-foreground">Ambiente CartoQuali · solução independente, sem vínculo com ANOREG, PQTA ou CNJ</p></main></div>
    </div>
  </div>;
}
