import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowUpRight, CheckCircle2, Filter, MessageSquareText, RefreshCw, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD_PERIODS } from "@/constants/cartoquali";
import type { DashboardPeriod } from "@/types/cartoquali";
import { GlassPanel, PageHeader, Stars } from "./primitives";
import { useRealDashboard } from "./use-real-dashboard";

const number = (value: number | null, digits = 1) => value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("30 dias");
  const [pointId, setPointId] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const query = useRealDashboard({ period, pointId: pointId || undefined });
  const data = query.data;
  const filters = <GlassPanel className="mb-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex flex-wrap gap-1">{DASHBOARD_PERIODS.map((item) => <Button key={item} size="sm" variant={period === item ? "default" : "ghost"} onClick={() => setPeriod(item)}>{item}</Button>)}</div><label className="lg:ml-auto"><span className="sr-only">Ponto de avaliação</span><select className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm" value={pointId} onChange={(event) => setPointId(event.target.value)}><option value="">Todos os pontos</option>{data?.filters.points.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label></div></GlassPanel>;

  return <div className="animate-enter"><PageHeader eyebrow="Painel do gestor" title="Visão geral do cartório" description="Indicadores calculados diretamente das avaliações registradas." action={<div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Atualizar indicadores" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""}/></Button><Button className="lg:hidden" variant="outline" onClick={() => setMobileFilters(true)}><Filter/>Filtros</Button></div>}/>
    <div className="hidden lg:block">{filters}</div>{mobileFilters && <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/25 p-4" role="dialog" aria-modal="true" aria-label="Filtros do painel"><div className="mx-auto my-8 max-w-xl rounded-lg bg-background p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Filtros</h2><Button size="icon" variant="ghost" aria-label="Fechar filtros" onClick={() => setMobileFilters(false)}><X/></Button></div>{filters}<Button className="w-full" onClick={() => setMobileFilters(false)}>Aplicar filtros</Button></div></div>}
    {query.isPending && <LoadingPanels/>}
    {query.isError && <GlassPanel className="border-destructive/30 text-center"><AlertCircle className="mx-auto size-7 text-destructive"/><h2 className="mt-3 font-display text-lg font-bold">Não foi possível carregar os indicadores</h2><p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p><Button className="mt-4" onClick={() => query.refetch()}><RefreshCw/>Tentar novamente</Button></GlassPanel>}
    {data && <DashboardContent data={data}/>} 
  </div>;
}

function DashboardContent({ data }: { data: NonNullable<ReturnType<typeof useRealDashboard>["data"]> }) {
  const summary = data.summary;
  const hasData = summary.total > 0;
  const distribution = Object.fromEntries(data.distribution.map((item) => [item.rating, item.count]));
  const stats = [
    ["Satisfação geral", hasData ? `${number(summary.satisfaction)}%` : "—"],
    ["Média de avaliação", hasData ? `${number(summary.average)} / 5` : "—"],
    ["Avaliações recebidas", String(summary.total)],
    ["Resolutividade", summary.resolution === null ? "Dados insuficientes" : `${number(summary.resolution)}%`],
    ["Avaliações negativas", String(summary.negative_count)],
  ];
  if (!hasData) return <GlassPanel className="py-14 text-center"><MessageSquareText className="mx-auto size-8 text-muted-foreground"/><h2 className="mt-4 font-display text-xl font-bold">Ainda não existem avaliações suficientes para gerar este indicador</h2><p className="mt-2 text-sm text-muted-foreground">Altere os filtros ou aguarde novas avaliações.</p></GlassPanel>;
  return <>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{stats.map(([label, value]) => <GlassPanel key={label} className="min-w-0 p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 break-words font-display text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">dados do período selecionado</p></GlassPanel>)}</div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3"><GlassPanel className="lg:col-span-2"><h2 className="font-display font-bold">Volume ao longo do tempo</h2><p className="text-xs text-muted-foreground">Quantidade real de avaliações por intervalo</p><div className="mt-6 flex h-52 items-end gap-2 sm:gap-4">{data.series.map((item) => { const max = Math.max(...data.series.map((entry) => entry.total), 1); return <div key={item.bucket} className="flex h-full flex-1 flex-col justify-end gap-2"><span className="text-center text-[10px] font-semibold">{item.total}</span><div className="w-full rounded-t-md bg-primary/70" style={{ height: `${Math.max(8, item.total / max * 100)}%` }}/><span className="truncate text-center text-[10px] text-muted-foreground">{new Date(item.bucket).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" })}</span></div>; })}</div></GlassPanel>
      <GlassPanel><h2 className="font-display font-bold">Distribuição das notas</h2><div className="mt-5 space-y-4">{[5,4,3,2,1].map((rating) => { const count = distribution[rating] ?? 0; return <div key={rating}><div className="mb-1 flex justify-between text-xs"><span className="flex items-center gap-1">{rating}<Star className="size-3 fill-current text-rating"/></span><strong>{count} · {(count / summary.total * 100).toFixed(0)}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent-foreground" style={{ width: `${count / summary.total * 100}%` }}/></div></div>; })}</div></GlassPanel></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><GlassPanel><h2 className="flex items-center gap-2 font-display font-bold"><CheckCircle2 className="size-5 text-success"/>Desempenho por ponto</h2><div className="mt-4 space-y-3">{data.points.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.name}</span><strong>{item.total ? `${number(item.average)} · ${item.total}` : "Sem avaliações"}</strong></div>)}</div></GlassPanel>
      <GlassPanel><h2 className="flex items-center gap-2 font-display font-bold"><MessageSquareText className="size-5 text-primary"/>Avaliações recentes</h2><div className="mt-4 space-y-4">{data.recent.map((review) => <div key={review.id} className="border-b border-glass-border pb-3 last:border-0"><div className="flex items-center justify-between gap-3"><Stars value={review.rating} size="sm"/><span className="text-[11px] text-muted-foreground">{review.point_name}</span></div><p className="mt-1 line-clamp-1 text-sm">{review.comment || "Sem comentário"}</p></div>)}</div><Button asChild variant="link" className="mt-2 px-0"><Link to="/avaliacoes">Ver todas <ArrowUpRight/></Link></Button></GlassPanel></div>
  </>;
}
function LoadingPanels() { return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Carregando indicadores">{Array.from({ length: 5 }).map((_, index) => <GlassPanel key={index} className="h-28 animate-pulse bg-muted/40"/>)}</div>; }
