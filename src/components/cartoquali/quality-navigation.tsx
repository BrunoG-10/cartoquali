import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items: Array<{to:"/qualidade"|"/ocorrencias"|"/planos-melhoria";label:string;search?:{section:string}}> = [
  { to: "/qualidade", label: "Visão Geral" },
  { to: "/qualidade", label: "Indicadores", search: { section: "Indicadores" } },
  { to: "/ocorrencias", label: "Ocorrências" },
  { to: "/planos-melhoria", label: "Planos de Melhoria" },
  { to: "/qualidade", label: "Evolução", search: { section: "Evolução" } },
  { to: "/qualidade", label: "Metodologia", search: { section: "Metodologia" } },
] as const;

export function QualityNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return <nav className="mb-5 overflow-x-auto border-b border-glass-border" aria-label="Áreas de qualidade"><div className="flex min-w-max gap-1">{items.map((item) => <Button key={`${item.to}-${item.label}`} asChild variant="ghost" className={cn("rounded-b-none border-b-2 border-transparent", pathname === item.to && item.to !== "/qualidade" && "border-primary bg-primary/10 text-primary")}>{item.search?<Link to={item.to} search={item.search}>{item.label}</Link>:<Link to={item.to}>{item.label}</Link>}</Button>)}</div></nav>;
}