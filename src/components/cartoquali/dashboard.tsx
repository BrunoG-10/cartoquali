import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowUpRight, Filter, MapPin, MessageSquareText, Minus, RefreshCw, Star, TrendingDown, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERIODS } from "@/constants/cartoquali";
import type { DashboardPeriod } from "@/types/cartoquali";
import { GlassPanel, PageHeader, Stars } from "./primitives";
import { useRealDashboard } from "./use-real-dashboard";

const number = (value: number | null, digits = 1) => value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("30 dias");
  const [pointId, setPointId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const query = useRealDashboard({ period, pointId: pointId || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
  const data = query.data;
  const filters = <GlassPanel className="mb-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex flex-wrap gap-1">{DASHBOARD_PERIODS.map((item) => <Button key={item} size="sm" variant={period === item ? "default" : "ghost"} onClick={() => setPeriod(item)}>{item}</Button>)}</div><label className="lg:ml-auto"><span className="sr-only">Ponto de avaliação</span><select className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm" value={pointId} onChange={(event) => setPointId(event.target.value)}><option value="">Todos os pontos</option>{data?.filters.points.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label></div>{period === "Personalizado" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-muted-foreground">Data inicial<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}/></label><label className="grid gap-1 text-xs font-semibold text-muted-foreground">Data final<Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)}/></label></div>}</GlassPanel>;

  return <div className="animate-enter"><PageHeader eyebrow="Painel do gestor" title="Visão geral do cartório" description="Indicadores calculados diretamente das avaliações registradas." action={<div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Atualizar indicadores" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""}/></Button><Button className="lg:hidden" variant="outline" onClick={() => setMobileFilters(true)}><Filter/>Filtros</Button></div>}/>
    <div className="hidden lg:block">{filters}</div>{mobileFilters && <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/25 p-4" role="dialog" aria-modal="true" aria-label="Filtros do painel"><div className="mx-auto my-8 max-w-xl rounded-lg bg-background p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Filtros</h2><Button size="icon" variant="ghost" aria-label="Fechar filtros" onClick={() => setMobileFilters(false)}><X/></Button></div>{filters}<Button className="w-full" onClick={() => setMobileFilters(false)}>Aplicar filtros</Button></div></div>}
    {query.isPending && <LoadingPanels/>}
    {query.isError && <GlassPanel className="border-destructive/30 text-center"><AlertCircle className="mx-auto size-7 text-destructive"/><h2 className="mt-3 font-display text-lg font-bold">Não foi possível carregar os indicadores</h2><p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p><Button className="mt-4" onClick={() => query.refetch()}><RefreshCw/>Tentar novamente</Button></GlassPanel>}
    {data && <DashboardContent data={data}/>} 
  </div>;
}

type Trend = { text: string; tone: "up" | "down" | "flat" | "none" };

// Compares the current value with the previous period of the same length.
// "unit" is how the difference is written: percentage points, plain number or count.
function trend(current: number | null, previous: number | null, previousTotal: number, unit: "pp" | "number" | "count"): Trend {
  if (current === null || previous === null || previousTotal === 0) return { text: "Sem dados do período anterior", tone: "none" };
  const diff = current - previous;
  const rounded = unit === "count" ? Math.round(diff) : Math.round(diff * 10) / 10;
  if (rounded === 0) return { text: "Estável vs. período anterior", tone: "flat" };
  const value = Math.abs(rounded).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const suffix = unit === "pp" ? " p.p." : "";
  return { text: `${rounded > 0 ? "+" : "−"}${value}${suffix} vs. período anterior`, tone: rounded > 0 ? "up" : "down" };
}

function KpiCard({ label, value, detail, trend: t, positiveIsGood = true }: { label: string; value: string; detail?: ReactNode; trend: Trend; positiveIsGood?: boolean }) {
  const good = t.tone === "up" ? positiveIsGood : t.tone === "down" ? !positiveIsGood : null;
  const TrendIcon = t.tone === "up" ? TrendingUp : t.tone === "down" ? TrendingDown : Minus;
  return <GlassPanel className="min-w-0 p-4">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 break-words font-display text-3xl font-bold">{value}</p>
    {detail}
    <p className={cn("mt-2 flex items-center gap-1 text-xs", good === true && "text-success", good === false && "text-destructive", good === null && "text-muted-foreground")}>
      {t.tone !== "none" && <TrendIcon className="size-3.5" aria-hidden="true" />}{t.text}
    </p>
  </GlassPanel>;
}

const bucketLabel = (bucket: string) => new Date(bucket).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" });

function DashboardContent({ data }: { data: NonNullable<ReturnType<typeof useRealDashboard>["data"]> }) {
  const summary = data.summary;
  const previous = data.previousSummary;
  const hasData = summary.total > 0;
  const distribution = Object.fromEntries(data.distribution.map((item) => [item.rating, item.count]));
  const maxBucket = Math.max(...data.series.map((entry) => entry.total), 1);
  if (!hasData) return <GlassPanel className="py-14 text-center"><MessageSquareText className="mx-auto size-8 text-muted-foreground"/><h2 className="mt-4 font-display text-xl font-bold">Ainda não existem avaliações neste período</h2><p className="mt-2 text-sm text-muted-foreground">Altere os filtros ou aguarde novas avaliações.</p></GlassPanel>;
  return <>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Satisfação geral" value={`${number(summary.satisfaction)}%`} trend={trend(summary.satisfaction, previous.satisfaction, previous.total, "pp")} />
      <KpiCard label="Nota média" value={`${number(summary.average)} / 5`} trend={trend(summary.average, previous.average, previous.total, "number")} />
      <KpiCard
        label="Avaliações recebidas"
        value={summary.total.toLocaleString("pt-BR")}
        detail={<p className={cn("mt-1 text-xs font-medium", summary.negative_count > 0 ? "text-warning" : "text-muted-foreground")}>{summary.negative_count === 1 ? "1 negativa" : `${summary.negative_count} negativas`}</p>}
        trend={trend(summary.total, previous.total, previous.total, "count")}
      />
      <KpiCard label="Resolutividade" value={summary.resolution === null ? "—" : `${number(summary.resolution)}%`} detail={summary.resolution === null ? <p className="mt-1 text-xs text-muted-foreground">Dados insuficientes</p> : undefined} trend={trend(summary.resolution, previous.resolution, previous.total, "pp")} />
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <GlassPanel className="lg:col-span-2">
        <h2 className="font-display text-lg font-bold">Volume ao longo do tempo</h2>
        <p className="text-sm text-muted-foreground">Quantidade de avaliações por intervalo</p>
        <div className="mt-6 flex h-52 items-end gap-2 sm:gap-4" role="img" aria-label={`Avaliações por intervalo: ${data.series.map((item) => `${bucketLabel(item.bucket)}, ${item.total}`).join("; ")}`}>
          {data.series.map((item) => <div key={item.bucket} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <span className="text-center text-xs font-semibold">{item.total}</span>
            <div className="w-full rounded-t-md bg-chart-1" style={{ height: `${Math.max(4, item.total / maxBucket * 100)}%` }} title={`${bucketLabel(item.bucket)}: ${item.total}`} />
            <span className="truncate text-center text-xs text-muted-foreground">{bucketLabel(item.bucket)}</span>
          </div>)}
        </div>
      </GlassPanel>
      <GlassPanel>
        <h2 className="font-display text-lg font-bold">Distribuição das notas</h2>
        <div className="mt-5 space-y-4">{[5, 4, 3, 2, 1].map((rating) => {
          const count = distribution[rating] ?? 0;
          const share = count / summary.total * 100;
          return <div key={rating}>
            <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-1">{rating}<Star className="size-3.5 fill-current text-rating" aria-hidden="true"/></span><span><strong>{count}</strong> <span className="text-muted-foreground">· {share.toFixed(0)}%</span></span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", rating <= 3 ? "bg-chart-4" : "bg-rating")} style={{ width: `${share}%` }}/></div>
          </div>;
        })}</div>
        <p className="mt-4 text-xs text-muted-foreground">Notas de 1 a 3 contam como negativas.</p>
      </GlassPanel>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <GlassPanel>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MapPin className="size-5 text-primary" aria-hidden="true"/>Desempenho por ponto</h2>
        <ul className="mt-4 space-y-4">{data.points.map((item) => <li key={item.id}>
          <div className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{item.name}</span><span className="shrink-0">{item.total ? <><strong>{number(item.average)}</strong> <span className="text-muted-foreground">· {item.total} {item.total === 1 ? "avaliação" : "avaliações"}</span></> : <span className="text-muted-foreground">Sem avaliações</span>}</span></div>
          {item.total > 0 && item.average !== null && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-chart-1" style={{ width: `${item.average / 5 * 100}%` }}/></div>}
        </li>)}</ul>
      </GlassPanel>
      <GlassPanel>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MessageSquareText className="size-5 text-primary" aria-hidden="true"/>Avaliações recentes</h2>
        <ul className="mt-4 space-y-4">{data.recent.map((review) => <li key={review.id} className="border-b border-border pb-3 last:border-0">
          <div className="flex items-center justify-between gap-3"><Stars value={review.rating} size="sm"/><span className="truncate text-xs text-muted-foreground">{review.point_name} · {new Date(review.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span></div>
          <p className={cn("mt-1 line-clamp-2 text-sm", !review.comment && "text-muted-foreground")}>{review.comment || "Sem comentário"}</p>
        </li>)}</ul>
        <Button asChild variant="link" className="mt-2 px-0"><Link to="/avaliacoes">Ver todas <ArrowUpRight/></Link></Button>
      </GlassPanel>
    </div>
  </>;
}
function LoadingPanels() { return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Carregando indicadores">{Array.from({ length: 4 }).map((_, index) => <GlassPanel key={index} className="h-28 animate-pulse bg-muted/40"><span className="sr-only">Carregando</span></GlassPanel>)}</div>; }
