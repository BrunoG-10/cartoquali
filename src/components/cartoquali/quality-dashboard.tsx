import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Filter,
  FilterX,
  Gauge,
  MessageSquareText,
  Minus,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DASHBOARD_PERIODS, QUALITY_METHODOLOGY } from "@/constants/cartoquali";
import type { DashboardPeriod, QualityFilters } from "@/types/cartoquali";
import { cn } from "@/lib/utils";
import { GlassPanel, PageHeader } from "./primitives";
import { QualityNavigation } from "./quality-navigation";
import { useRealDashboard } from "./use-real-dashboard";

const sections = [
  "Visão Geral",
  "Indicadores",
  "Dimensões",
  "Evolução",
  "Pontos de Avaliação",
  "Metodologia",
] as const;
type Section = (typeof sections)[number];
type Metric = "average" | "satisfaction" | "resolution" | "negative_rate";
const metricLabels: Record<Metric, string> = {
  average: "Nota média",
  satisfaction: "Satisfação",
  resolution: "Resolutividade",
  negative_rate: "Negativas",
};
const n = (value: number | null, digits = 1) =>
  value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const delta = (current: number | null, previous: number | null) =>
  current === null || previous === null ? null : current - previous;

export function QualityDashboard() {
  // The section lives in the URL (?section=) so the tabs below and the QualityNavigation links
  // above stay in sync.
  const navigate = useNavigate();
  const urlSection = useRouterState({
    select: (state) => (state.location.search as { section?: string }).section,
  });
  const section: Section = sections.find((item) => item === urlSection) ?? "Visão Geral";
  const setSection = (next: Section) =>
    void navigate({
      to: "/qualidade",
      search: next === "Visão Geral" ? {} : { section: next },
      replace: true,
    });
  const [filters, setFilters] = useState<QualityFilters>({ period: "30 dias" });
  const [mobileFilters, setMobileFilters] = useState(false);
  const [metric, setMetric] = useState<Metric>("average");
  const query = useRealDashboard(filters);
  const data = query.data;
  const reset = () => setFilters({ period: "30 dias" });
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Gestão da experiência"
        title="Qualidade"
        description="Indicadores objetivos calculados a partir das avaliações reais."
        action={
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Atualizar indicadores"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
            </Button>
            <Button variant="outline" onClick={() => setMobileFilters(true)} className="lg:hidden">
              <Filter />
              Filtros
            </Button>
          </div>
        }
      />
      <QualityNavigation />
      <nav className="mb-5 overflow-x-auto" aria-label="Análises de qualidade">
        <div className="flex min-w-max gap-1">
          {sections.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={section === item ? "default" : "ghost"}
              onClick={() => setSection(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </nav>
      <div className="hidden lg:block">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          points={data?.filters.points ?? []}
          surveys={data?.filters.surveys ?? []}
          reset={reset}
        />
      </div>
      {query.isPending && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <GlassPanel key={i} className="h-28 animate-pulse bg-muted/40">
              <span className="sr-only">Carregando</span>
            </GlassPanel>
          ))}
        </div>
      )}
      {query.isError && (
        <GlassPanel className="text-center">
          <AlertCircle className="mx-auto size-7 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">
            Não foi possível carregar os indicadores
          </h2>
          <Button className="mt-4" onClick={() => query.refetch()}>
            <RefreshCw />
            Tentar novamente
          </Button>
        </GlassPanel>
      )}
      {data && data.summary.total === 0 && section !== "Metodologia" && <EmptyState />}
      {data && (data.summary.total > 0 || section === "Metodologia") && (
        <QualityContent section={section} data={data} metric={metric} setMetric={setMetric} />
      )}
      {mobileFilters && (
        <Overlay title="Filtros da qualidade" onClose={() => setMobileFilters(false)}>
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            points={data?.filters.points ?? []}
            surveys={data?.filters.surveys ?? []}
            reset={reset}
          />
          <Button className="mt-4 w-full" onClick={() => setMobileFilters(false)}>
            Aplicar filtros
          </Button>
        </Overlay>
      )}
    </div>
  );
}

type Data = NonNullable<ReturnType<typeof useRealDashboard>["data"]>;
function QualityContent({
  section,
  data,
  metric,
  setMetric,
}: {
  section: Section;
  data: Data;
  metric: Metric;
  setMetric(value: Metric): void;
}) {
  const s = data.summary,
    p = data.previousSummary;
  const kpis = [
    {
      label: "Satisfação",
      value: `${n(s.satisfaction)}%`,
      change: delta(s.satisfaction, p.satisfaction),
      icon: Star,
      unit: "p.p.",
    },
    {
      label: "Nota média",
      value: `${n(s.average)}/5`,
      change: delta(s.average, p.average),
      icon: Gauge,
      unit: "",
    },
    {
      label: "Avaliações",
      value: String(s.total),
      change: delta(s.total, p.total),
      icon: MessageSquareText,
      unit: "",
    },
    {
      label: "Taxa de negativas",
      value: `${n(s.negative_rate)}%`,
      change: delta(s.negative_rate, p.negative_rate),
      icon: AlertCircle,
      unit: "p.p.",
      inverse: true,
    },
    {
      label: "Resolutividade",
      value: s.resolution === null ? "Dados insuficientes" : `${n(s.resolution)}%`,
      change: delta(s.resolution, p.resolution),
      icon: BarChart3,
      unit: "p.p.",
    },
  ];
  const distribution = Object.fromEntries(
    data.distribution.map((item) => [item.rating, item.count]),
  );
  const overview = (
    <>
      <KpiGrid items={kpis} />
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <EvolutionChart data={data.series} metric={metric} setMetric={setMetric} />
        <Distribution data={distribution} total={s.total} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <DimensionMap dimensions={data.dimensions} />
        <RealDataNotice />
      </div>
    </>
  );
  if (section === "Visão Geral") return <div className="mt-5 space-y-5">{overview}</div>;
  if (section === "Indicadores")
    return (
      <div className="mt-5 space-y-5">
        <KpiGrid items={kpis} />
        <GlassPanel>
          <h2 className="font-display text-lg font-bold">Comparação com o período anterior</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-glass-border">
                  {["Indicador", "Atual", "Anterior", "Diferença"].map((x) => (
                    <th className="px-3 py-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.map((item) => (
                  <tr key={item.label} className="border-b border-glass-border last:border-0">
                    <td className="px-3 py-4 font-semibold">{item.label}</td>
                    <td className="px-3 py-4">{item.value}</td>
                    <td className="px-3 py-4">{previousValue(item.label, p)}</td>
                    <td className="px-3 py-4">
                      <Trend value={item.change} inverse={item.inverse ?? false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </div>
    );
  if (section === "Dimensões")
    return (
      <div className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {data.dimensions.map((item) => (
            <GlassPanel key={item.key}>
              <h2 className="font-semibold">{item.label}</h2>
              {item.index === null ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Dados insuficientes para este indicador
                </p>
              ) : (
                <>
                  <p className="mt-3 font-display text-3xl font-bold">{n(item.index, 0)}%</p>
                  <Progress value={item.index} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {item.responses} respostas válidas
                  </p>
                </>
              )}
            </GlassPanel>
          ))}
        </div>
        <DimensionMap dimensions={data.dimensions} />
      </div>
    );
  if (section === "Evolução")
    return (
      <div className="mt-5">
        <EvolutionChart data={data.series} metric={metric} setMetric={setMetric} />
      </div>
    );
  if (section === "Pontos de Avaliação")
    return (
      <div className="mt-5">
        <PointTable rows={data.points} />
      </div>
    );
  return <Methodology />;
}

function KpiGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    change: number | null;
    icon: typeof Star;
    unit: string;
    inverse?: boolean;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(({ label, value, change, icon: Icon, unit, inverse }) => (
        <GlassPanel key={label}>
          <div className="flex items-start justify-between">
            <Icon className="size-5 text-primary" />
            <Trend value={change} inverse={inverse ?? false} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{label}</p>
          <p className="break-words font-display text-2xl font-bold">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {change === null
              ? "Sem base comparável"
              : `${change > 0 ? "+" : ""}${change.toFixed(1)} ${unit} vs. período anterior`}
          </p>
        </GlassPanel>
      ))}
    </div>
  );
}
function Trend({ value, inverse = false }: { value: number | null; inverse: boolean }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-semibold",
        value === 0 ? "text-muted-foreground" : positive ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="mr-1 size-3.5" />
      {Math.abs(value).toFixed(1)}
    </span>
  );
}
function EvolutionChart({
  data,
  metric,
  setMetric,
}: {
  data: Data["series"];
  metric: Metric;
  setMetric(value: Metric): void;
}) {
  const ceiling = metric === "average" ? 5 : 100;
  return (
    <GlassPanel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Evolução da qualidade</h2>
          <p className="text-sm text-muted-foreground">Dados reais do período selecionado</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(metricLabels) as Metric[]).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={metric === item ? "default" : "ghost"}
              onClick={() => setMetric(item)}
            >
              {metricLabels[item]}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-8 flex h-56 items-end gap-2 border-b border-glass-border">
        {data.map((item) => {
          const value = item[metric] ?? 0;
          return (
            <div
              key={item.bucket}
              className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
            >
              <span className="mb-2 text-xs font-semibold">
                {n(value, metric === "average" ? 1 : 0)}
                {metric === "average" ? "" : "%"}
              </span>
              <div
                className="mx-auto w-full max-w-14 rounded-t-md bg-primary/80"
                style={{ height: `${Math.max(5, (value / ceiling) * 100)}%` }}
              />
              <span className="mt-2 truncate text-[10px] text-muted-foreground">
                {new Date(item.bucket).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
function Distribution({ data, total }: { data: Record<number, number>; total: number }) {
  return (
    <GlassPanel>
      <h2 className="font-display text-lg font-bold">Distribuição das notas</h2>
      <p className="text-sm text-muted-foreground">A soma corresponde ao total filtrado</p>
      <div className="mt-5 space-y-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = data[rating] ?? 0;
          const percent = (count / total) * 100;
          return (
            <div key={rating} className="grid grid-cols-[44px_1fr_76px] items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-semibold">
                {rating}
                <Star className="size-3.5 fill-current text-rating" />
              </span>
              <Progress value={percent} />
              <span className="text-right text-xs text-muted-foreground">
                {count} · {percent.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
function DimensionMap({ dimensions }: { dimensions: Data["dimensions"] }) {
  return (
    <GlassPanel>
      <h2 className="font-display text-lg font-bold">Dimensões da qualidade</h2>
      <p className="text-sm text-muted-foreground">Somente respostas numericamente compatíveis</p>
      <div className="mt-5 space-y-4">
        {dimensions.map((item) => (
          <div key={item.key}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <strong>
                {item.index === null ? "Dados insuficientes" : `${n(item.index, 0)}%`}
              </strong>
            </div>
            {item.index !== null && <Progress value={item.index} />}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
function PointTable({ rows }: { rows: Data["points"] }) {
  return (
    <GlassPanel>
      <h2 className="font-display text-lg font-bold">Qualidade por ponto</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-glass-border">
              {["Ponto", "Avaliações", "Nota média", "Satisfação", "Negativas"].map((x) => (
                <th className="px-3 py-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-glass-border last:border-0">
                <td className="px-3 py-4 font-semibold">{row.name}</td>
                <td className="px-3 py-4">{row.total}</td>
                <td className="px-3 py-4">{row.total ? n(row.average) : "—"}</td>
                <td className="px-3 py-4">{row.total ? `${n(row.satisfaction)}%` : "—"}</td>
                <td className="px-3 py-4">{row.total ? `${n(row.negative_rate)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
function RealDataNotice() {
  return (
    <GlassPanel>
      <h2 className="font-display text-lg font-bold">Fonte dos indicadores</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Todos os números desta página vêm das avaliações e respostas registradas no Supabase.
        Ocorrências e planos de melhoria permanecem nos módulos próprios e não entram nestes
        cálculos nesta etapa.
      </p>
    </GlassPanel>
  );
}
function EmptyState() {
  return (
    <GlassPanel className="py-14 text-center">
      <MessageSquareText className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-4 font-display text-xl font-bold">
        Ainda não existem avaliações suficientes para gerar este indicador
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">Altere o período, o ponto ou a pesquisa.</p>
    </GlassPanel>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
function previousValue(label: string, p: Data["previousSummary"]) {
  if (label === "Satisfação") return p.satisfaction === null ? "—" : `${n(p.satisfaction)}%`;
  if (label === "Nota média") return p.average === null ? "—" : `${n(p.average)}/5`;
  if (label === "Avaliações") return String(p.total);
  if (label === "Taxa de negativas")
    return p.negative_rate === null ? "—" : `${n(p.negative_rate)}%`;
  return p.resolution === null ? "—" : `${n(p.resolution)}%`;
}
function FilterBar({
  filters,
  setFilters,
  points,
  surveys,
  reset,
}: {
  filters: QualityFilters;
  setFilters: (value: QualityFilters | ((current: QualityFilters) => QualityFilters)) => void;
  points: Array<{ id: string; name: string }>;
  surveys: Array<{ id: string; name: string }>;
  reset(): void;
}) {
  const change = (key: "pointId" | "surveyId", value: string) =>
    setFilters((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  return (
    <GlassPanel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Período">
          <select
            value={filters.period}
            onChange={(e) =>
              setFilters((current) => ({ ...current, period: e.target.value as DashboardPeriod }))
            }
          >
            {DASHBOARD_PERIODS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Ponto">
          <select value={filters.pointId ?? ""} onChange={(e) => change("pointId", e.target.value)}>
            <option value="">Todos</option>
            {points.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pesquisa">
          <select
            value={filters.surveyId ?? ""}
            onChange={(e) => change("surveyId", e.target.value)}
          >
            <option value="">Todas</option>
            {surveys.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="outline" className="self-end" onClick={reset}>
          <FilterX />
          Limpar filtros
        </Button>
      </div>
      {filters.period === "Personalizado" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Data inicial">
            <Input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(e) => setFilters((current) => ({ ...current, startDate: e.target.value }))}
            />
          </Field>
          <Field label="Data final">
            <Input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(e) => setFilters((current) => ({ ...current, endDate: e.target.value }))}
            />
          </Field>
        </div>
      )}
    </GlassPanel>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      <div className="[&_select]:h-9 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm [&_select]:text-foreground">
        {children}
      </div>
    </label>
  );
}
function Overlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/25 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto my-8 max-w-xl rounded-lg border border-glass-border bg-background p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <Button size="icon" variant="ghost" aria-label="Fechar" onClick={onClose}>
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Methodology() {
  return (
    <div className="mt-5 space-y-5">
      <GlassPanel>
        <p className="text-xs font-semibold uppercase text-primary">
          Versão {QUALITY_METHODOLOGY.version}
        </p>
        <h2 className="font-display text-2xl font-bold">Metodologia CartoQuali</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Leitura transparente baseada exclusivamente nas avaliações e respostas registradas.
        </p>
      </GlassPanel>
      <div className="grid gap-4 md:grid-cols-2">
        {QUALITY_METHODOLOGY.indicators.map((item) => (
          <GlassPanel key={item.key}>
            <h3 className="font-semibold">{item.label}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.definition}</p>
            {QUALITY_METHODOLOGY.formulas[item.key] && (
              <p className="mt-4 rounded-md bg-muted p-3 font-mono text-xs">
                {QUALITY_METHODOLOGY.formulas[item.key]}
              </p>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
