import { useEffect, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileBarChart,
  FileText,
  Gauge,
  ListChecks,
  MessageSquareText,
  Printer,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportQualityReportCsv, type QualityReportData } from "@/lib/quality-reports.functions";
import { cn } from "@/lib/utils";
import { decimalBR, percentBR, plural } from "@/lib/format";
import type { DashboardPeriod, ReportKind } from "@/types/cartoquali";
import { validatePeriod } from "@/utils/cartoquali-validation";
import { reportInput, useQualityReport, type RealReportFilters } from "./use-quality-report";
import { GlassPanel, InterfaceState, PageHeader, StatusBadge } from "./primitives";

const catalog: Array<{
  kind: ReportKind;
  title: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    kind: "qualidade",
    title: "Relatório de Qualidade",
    description: "Indicadores, dimensões, ocorrências, planos e evidências consolidados.",
    icon: Gauge,
  },
  {
    kind: "avaliacoes",
    title: "Relatório de Avaliações",
    description: "Avaliações reais do período, sem expor dados de contato.",
    icon: MessageSquareText,
  },
  {
    kind: "indicadores",
    title: "Relatório de Indicadores",
    description: "Comparação com o período anterior e evolução temporal.",
    icon: FileBarChart,
  },
  {
    kind: "ocorrencias",
    title: "Relatório de Ocorrências",
    description: "Problemas por situação, categoria e prioridade.",
    icon: AlertTriangle,
  },
  {
    kind: "planos-melhoria",
    title: "Relatório de Melhorias",
    description: "Ações, prazos, progresso e resultados observados.",
    icon: ListChecks,
  },
  {
    kind: "satisfacao",
    title: "Relatório de Satisfação",
    description: "Notas e desempenho por ponto de avaliação.",
    icon: Sparkles,
  },
  {
    kind: "executivo",
    title: "Visão Executiva",
    description: "Leitura resumida da qualidade e das ações de gestão.",
    icon: FileText,
  },
];
const periods: DashboardPeriod[] = [
  "Hoje",
  "7 dias",
  "30 dias",
  "Este mês",
  "Mês anterior",
  "90 dias",
  "Este ano",
  "Personalizado",
];
const occurrenceLabels: Record<string, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  em_tratamento: "Em tratamento",
  resolvida: "Resolvida",
  encerrada: "Encerrada",
};
const planLabels: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const priorityLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function ReportsCatalog() {
  return (
    <div className="animate-enter space-y-6">
      <PageHeader
        eyebrow="Análise gerencial"
        title="Relatórios"
        description="Consulte informações reais do ciclo de qualidade do seu cartório."
      />
      <GlassPanel className="border-primary/25">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileBarChart />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">Relatório consolidado</h2>
            <p className="text-sm text-muted-foreground">
              Abra a visão completa e ajuste período, ponto, pesquisa e situação.
            </p>
          </div>
        </div>
        <Button asChild className="mt-5">
          <Link to="/relatorios/$tipo" params={{ tipo: "qualidade" }}>
            Gerar relatório
            <ChevronRight />
          </Link>
        </Button>
      </GlassPanel>
      <div data-tour="reports-catalog" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map(({ kind, title, description, icon: Icon }) => (
          <GlassPanel key={kind} className="flex min-h-56 flex-col">
            <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon />
            </span>
            <h2 className="mt-5 font-display text-xl font-bold">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
            <Button asChild className="mt-5">
              <Link to="/relatorios/$tipo" params={{ tipo: kind }}>
                Visualizar
                <ChevronRight />
              </Link>
            </Button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

export function ReportViewer({ kind }: { kind: ReportKind }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RealReportFilters>({ period: "Este ano" });
  const [validationError, setValidationError] = useState<string>();
  const report = useQualityReport(filters);
  const exportFn = useServerFn(exportQualityReportCsv);
  const csv = useMutation({
    mutationFn: exportFn,
    onSuccess: ({ filename, content }) => {
      const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
  const apply = (next: RealReportFilters) => {
    const error =
      next.period === "Personalizado" ? validatePeriod(next.startDate, next.endDate) : undefined;
    setValidationError(error);
    if (!error) setFilters(next);
  };
  const title = catalog.find((item) => item.kind === kind)?.title ?? "Relatório de Qualidade";
  if (report.isLoading)
    return (
      <ReportFrame title={title}>
        <GlassPanel>
          <InterfaceState
            kind="loading"
            title="Calculando relatório"
            description="Consolidando os dados reais do período selecionado."
          />
        </GlassPanel>
      </ReportFrame>
    );
  if (report.isError || !report.data)
    return (
      <ReportFrame title={title}>
        <GlassPanel>
          <InterfaceState
            kind="error"
            title="Não foi possível gerar o relatório"
            description="Confira sua sessão e tente novamente."
            action={
              <Button variant="outline" onClick={() => void report.refetch()}>
                <RefreshCw />
                Tentar novamente
              </Button>
            }
          />
        </GlassPanel>
      </ReportFrame>
    );
  const data = report.data;
  return (
    <div className="report-page animate-enter">
      <div className="print-hidden mb-4">
        <Button asChild variant="ghost">
          <Link to="/relatorios">
            <ArrowLeft />
            Relatórios disponíveis
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow="Documento gerencial"
        title={title}
        description={`${data.registry.trade_name} · dados atualizados`}
        action={
          <div data-tour="report-actions" className="print-hidden flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void report.refetch()}
              disabled={report.isFetching}
            >
              <RefreshCw className={cn(report.isFetching && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              disabled={report.isFetching}
              title={report.isFetching ? "Aguarde a atualização do relatório" : undefined}
            >
              <Printer />
              Imprimir
            </Button>
            <Button
              onClick={() => csv.mutate({ data: reportInput(filters) })}
              disabled={csv.isPending}
            >
              <Download />
              {csv.isPending ? "Exportando…" : "Exportar CSV"}
            </Button>
          </div>
        }
      />
      <div className="report-identification mb-5 grid gap-3 border-y border-glass-border py-4 text-sm sm:grid-cols-3">
        <Info label="Cartório" value={data.registry.official_name} />
        <Info label="Período" value={periodLabel(filters)} />
        <Info label="Gerado em" value={new Date().toLocaleString("pt-BR")} />
        <div className="sm:col-span-3">
          <Info label="Filtros aplicados" value={filtersLabel(filters, data)} />
        </div>
      </div>
      <FilterBar
        kind={kind}
        filters={filters}
        data={data}
        {...(validationError ? { validationError } : {})}
        onApply={apply}
      />
      {csv.isError && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft p-3 text-sm text-destructive">
          Não foi possível exportar o CSV. Tente novamente.
        </p>
      )}
      {data.summary.total === 0 &&
      data.management.occurrences_total === 0 &&
      data.management.plans_total === 0 ? (
        <GlassPanel className="mt-5">
          <InterfaceState
            kind="empty"
            title="Sem dados no período"
            description="Altere os filtros para consultar outro recorte."
          />
        </GlassPanel>
      ) : (
        <div className="mt-5 space-y-5">
          <Summary data={data} filters={filters} navigate={navigate} />
          {kind !== "ocorrencias" && kind !== "planos-melhoria" && (
            <>
              <Evolution data={data} />
              <div className="grid gap-5 xl:grid-cols-2">
                <Distribution data={data} />
                <Dimensions data={data} />
              </div>
              <Points data={data} />
            </>
          )}
          {kind !== "avaliacoes" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Occurrences data={data} navigate={navigate} />
              <Plans data={data} navigate={navigate} />
            </div>
          )}
          {["qualidade", "avaliacoes", "satisfacao"].includes(kind) && (
            <Evaluations data={data} navigate={navigate} />
          )}{" "}
          {["qualidade", "executivo"].includes(kind) && <Evidence data={data} />}
        </div>
      )}
      <Footer />
    </div>
  );
}

function ReportFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Documento gerencial"
        title={title}
        description="Relatório de qualidade do cartório."
      />
      {children}
    </div>
  );
}
function FilterBar({
  kind,
  filters,
  data,
  validationError,
  onApply,
}: {
  kind: ReportKind;
  filters: RealReportFilters;
  data: QualityReportData;
  validationError?: string;
  onApply: (value: RealReportFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => setDraft(filters), [filters]);
  // Filters apply as soon as they change, so what is on screen (and printed) always matches the
  // selection. A custom period waits until both dates are filled.
  const update = <K extends keyof RealReportFilters>(key: K, value: RealReportFilters[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (next.period !== "Personalizado" || (next.startDate && next.endDate)) onApply(next);
  };
  return (
    <GlassPanel className="print-hidden" tour="report-filters">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select
          label="Período"
          value={draft.period}
          onChange={(v) => update("period", v as DashboardPeriod)}
          options={periods}
          labels={{
            "7 dias": "Últimos 7 dias",
            "30 dias": "Últimos 30 dias",
            "90 dias": "Últimos 90 dias",
          }}
        />
        <Select
          label="Ponto"
          value={draft.pointId ?? ""}
          onChange={(v) => update("pointId", v || undefined)}
          options={["", ...data.filters.points.map((x) => x.id)]}
          labels={{
            "": "Todos",
            ...Object.fromEntries(data.filters.points.map((x) => [x.id, x.name])),
          }}
        />
        <Select
          label="Pesquisa"
          value={draft.surveyId ?? ""}
          onChange={(v) => update("surveyId", v || undefined)}
          options={["", ...data.filters.surveys.map((x) => x.id)]}
          labels={{
            "": "Todas",
            ...Object.fromEntries(data.filters.surveys.map((x) => [x.id, x.name])),
          }}
        />
        {kind === "ocorrencias" ? (
          <Select
            label="Situação"
            value={draft.occurrenceStatus ?? ""}
            onChange={(v) =>
              update("occurrenceStatus", (v || undefined) as RealReportFilters["occurrenceStatus"])
            }
            options={["", ...Object.keys(occurrenceLabels)]}
            labels={{ "": "Todas", ...occurrenceLabels }}
          />
        ) : kind === "planos-melhoria" ? (
          <Select
            label="Situação"
            value={draft.planStatus ?? ""}
            onChange={(v) =>
              update("planStatus", (v || undefined) as RealReportFilters["planStatus"])
            }
            options={["", ...Object.keys(planLabels)]}
            labels={{ "": "Todas", ...planLabels }}
          />
        ) : null}
      </div>
      {draft.period === "Personalizado" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Data inicial">
            <Input
              type="date"
              value={draft.startDate ?? ""}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </Field>
          <Field label="Data final">
            <Input
              type="date"
              value={draft.endDate ?? ""}
              onChange={(e) => update("endDate", e.target.value)}
            />
          </Field>
        </div>
      )}
      {validationError && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft p-3 text-sm text-destructive">
          {validationError}
        </p>
      )}
    </GlassPanel>
  );
}
function Summary({
  data,
  filters,
  navigate,
}: {
  data: QualityReportData;
  filters: RealReportFilters;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const s = data.summary,
    p = data.previousSummary,
    m = data.management;
  const range = reportInput(filters);
  const reviewSearch = {
    classification: "atencao",
    start: range.currentStart.slice(0, 10),
    end: new Date(new Date(range.currentEnd).getTime() - 1).toISOString().slice(0, 10),
    ...(filters.pointId ? { point: filters.pointId } : {}),
    ...(filters.surveyId ? { survey: filters.surveyId } : {}),
  };
  return (
    <div data-tour="report-summary" className="space-y-5">
      <SectionTitle
        title="Resumo executivo"
        description="Indicadores calculados a partir dos registros do período e comparados ao intervalo anterior equivalente."
      />
      <div className="report-kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Avaliações" value={s.total} hint={delta(s.total, p.total)} />
        <Kpi
          label="Nota média"
          value={s.average === null ? "Sem dados" : `${decimalBR(s.average)}/5`}
          hint={delta(s.average, p.average)}
        />
        <Kpi
          label="Satisfação"
          value={s.satisfaction === null ? "Sem dados" : percentBR(s.satisfaction)}
          hint={delta(s.satisfaction, p.satisfaction, " p.p.")}
        />
        <Kpi
          label="Avaliações negativas"
          value={s.negative_count}
          hint={delta(s.negative_count, p.negative_count)}
          action={() => void navigate({ to: "/avaliacoes", search: reviewSearch })}
        />
        <Kpi
          label="Ocorrências"
          value={m.occurrences_total}
          action={() => void navigate({ to: "/ocorrencias" })}
        />
        <Kpi label="Ocorrências resolvidas" value={m.occurrences_resolved} />
        <Kpi
          label="Planos"
          value={m.plans_total}
          action={() => void navigate({ to: "/planos-melhoria" })}
        />
        <Kpi
          label="Planos concluídos"
          value={m.plans_completed}
          action={() => void navigate({ to: "/planos-melhoria", search: { status: "concluido" } })}
        />
      </div>
    </div>
  );
}
function Kpi({
  label,
  value,
  hint,
  action,
}: {
  label: string;
  value: string | number;
  hint?: string;
  action?: () => void;
}) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 break-words font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  return action ? (
    <Button
      variant="outline"
      className="h-auto min-h-24 justify-start p-4 text-left"
      onClick={action}
    >
      <span>{body}</span>
    </Button>
  ) : (
    <GlassPanel className="min-h-24 p-4">{body}</GlassPanel>
  );
}
function delta(current: number | null, previous: number | null, suffix = "") {
  if (current === null || previous === null) return "Período anterior sem dados";
  const value = current - previous;
  return `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : decimalBR(value)}${suffix} vs. período anterior`;
}
function Evolution({ data }: { data: QualityReportData }) {
  return (
    <GlassPanel>
      <SectionTitle
        title="Evolução da qualidade"
        description="Volume, nota média, satisfação e negativas no fuso de São Paulo."
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr>
              {["Período", "Avaliações", "Nota média", "Satisfação", "Negativas"].map((x) => (
                <th key={x} className="border-b px-3 py-3 text-xs text-muted-foreground">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.series.map((x) => (
              <tr key={x.bucket}>
                <td className="border-b px-3 py-3 font-medium">
                  {new Date(x.bucket).toLocaleDateString("pt-BR")}
                </td>
                <td className="border-b px-3 py-3">{x.total}</td>
                <td className="border-b px-3 py-3">{decimalBR(x.average)}/5</td>
                <td className="border-b px-3 py-3">{percentBR(x.satisfaction)}</td>
                <td className="border-b px-3 py-3">{percentBR(x.negative_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.series.length && <EmptyText />}
      </div>
    </GlassPanel>
  );
}
function Distribution({ data }: { data: QualityReportData }) {
  const total = data.summary.total;
  return (
    <GlassPanel>
      <SectionTitle
        title="Distribuição das notas"
        description="Quantidade e percentual por nota."
      />
      <div className="mt-4 space-y-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = data.distribution.find((x) => x.rating === rating)?.count ?? 0;
          const percent = total ? (count / total) * 100 : 0;
          return (
            <div key={rating}>
              <div className="flex justify-between text-sm">
                <span>{plural(rating, "estrela", "estrelas")}</span>
                <strong>
                  {count} · {percentBR(percent)}
                </strong>
              </div>
              <progress className="mt-1 h-2 w-full accent-primary" max="100" value={percent} />
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
function Dimensions({ data }: { data: QualityReportData }) {
  return (
    <GlassPanel>
      <SectionTitle
        title="Dimensões de qualidade"
        description="Índices derivados das respostas válidas."
      />
      <div className="mt-4 space-y-3">
        {data.dimensions.map((x) => (
          <div
            key={x.key}
            className="flex items-center justify-between gap-3 border-b py-3 last:border-0"
          >
            <div>
              <p className="font-semibold">{x.label}</p>
              <p className="text-xs text-muted-foreground">
                {plural(x.responses, "resposta", "respostas")}
              </p>
            </div>
            <strong>
              {x.index === null
                ? "Sem dados suficientes no período selecionado."
                : percentBR(x.index)}
            </strong>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
function Points({ data }: { data: QualityReportData }) {
  return (
    <GlassPanel>
      <SectionTitle title="Pontos de avaliação" description="Desempenho no recorte selecionado." />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[660px] text-left text-sm">
          <thead>
            <tr>
              {["Ponto", "Avaliações", "Nota média", "Satisfação", "Negativas"].map((x) => (
                <th key={x} className="border-b px-3 py-3 text-xs text-muted-foreground">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.points.map((x) => (
              <tr key={x.id}>
                <td className="border-b px-3 py-3 font-semibold">{x.name}</td>
                <td className="border-b px-3 py-3">{x.total}</td>
                <td className="border-b px-3 py-3">
                  {x.average === null || x.average === undefined ? "—" : decimalBR(x.average)}
                </td>
                <td className="border-b px-3 py-3">
                  {x.satisfaction === null || x.satisfaction === undefined
                    ? "—"
                    : percentBR(x.satisfaction)}
                </td>
                <td className="border-b px-3 py-3">
                  {x.negative_rate === null || x.negative_rate === undefined
                    ? "—"
                    : percentBR(x.negative_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.points.length && <EmptyText />}
      </div>
    </GlassPanel>
  );
}
function Occurrences({
  data,
  navigate,
}: {
  data: QualityReportData;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const groups = (kind: string) => data.occurrenceGroups.filter((x) => x.kind === kind);
  return (
    <GlassPanel>
      <SectionTitle
        title="Ocorrências"
        description={`${data.management.occurrences_total} registros · ${data.management.occurrences_resolved} resolvidos ou encerrados`}
      />
      <GroupList items={groups("status")} labels={occurrenceLabels} />
      <GroupList items={groups("category")} />
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => void navigate({ to: "/ocorrencias" })}
      >
        Abrir ocorrências
        <ChevronRight />
      </Button>
    </GlassPanel>
  );
}
function Plans({
  data,
  navigate,
}: {
  data: QualityReportData;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <GlassPanel>
      <SectionTitle
        title="Planos de melhoria"
        description={`${data.management.plans_active} em andamento · ${data.management.plans_overdue} vencidos`}
      />
      <GroupList items={data.planGroups} labels={planLabels} />
      <div className="mt-4 space-y-2">
        {data.plans.slice(0, 3).map((x) => (
          <div key={x.id} className="rounded-md bg-muted p-3">
            <div className="flex justify-between gap-2">
              <strong className="text-sm">{x.title}</strong>
              <StatusBadge>{x.progress}%</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {x.owner ?? "Sem responsável"} · prazo {formatDate(x.due_date)}
            </p>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => void navigate({ to: "/planos-melhoria" })}
      >
        Abrir planos
        <ChevronRight />
      </Button>
    </GlassPanel>
  );
}
function Evaluations({
  data,
  navigate,
}: {
  data: QualityReportData;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <GlassPanel>
      <SectionTitle
        title="Avaliações do período"
        description="Comentários são exibidos sem dados de contato."
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr>
              {["Data", "Ponto", "Pesquisa", "Nota", "Status", "Comentário"].map((x) => (
                <th key={x} className="border-b px-3 py-3 text-xs text-muted-foreground">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.evaluations.slice(0, 100).map((x) => (
              <tr key={x.id}>
                <td className="border-b px-3 py-3">{formatDateTime(x.created_at)}</td>
                <td className="border-b px-3 py-3">{x.point_name}</td>
                <td className="border-b px-3 py-3">{x.survey_name}</td>
                <td className="border-b px-3 py-3 font-semibold">{x.rating}/5</td>
                <td className="border-b px-3 py-3">{x.status}</td>
                <td className="max-w-72 truncate border-b px-3 py-3">
                  {x.comment ?? "Sem comentário"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.evaluations.length && <EmptyText />}
      </div>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => void navigate({ to: "/avaliacoes" })}
      >
        Abrir avaliações
        <ChevronRight />
      </Button>
    </GlassPanel>
  );
}
function Evidence({ data }: { data: QualityReportData }) {
  return (
    <GlassPanel>
      <div className="flex items-center gap-2">
        <ClipboardList className="text-primary" />
        <SectionTitle
          title="Evidências do ciclo"
          description="Avaliação → Ocorrência → Plano de Melhoria → Resultado"
        />
      </div>
      <div className="mt-5 space-y-4">
        {data.evidence.map((x) => (
          <article
            key={`${x.evaluation_id}-${x.occurrence_id ?? "none"}-${x.plan_id ?? "none"}`}
            className="grid gap-3 rounded-md border p-4 md:grid-cols-3"
          >
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Avaliação</p>
              <p className="mt-2 font-semibold">
                {x.rating}/5 · {x.point_name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(x.evaluation_date)}
              </p>
              {x.comment && <p className="mt-2 text-sm">“{x.comment}”</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Ocorrência</p>
              {x.occurrence_id ? (
                <>
                  <p className="mt-2 font-semibold">{x.occurrence_title}</p>
                  <p className="mt-1 text-sm">{x.treatment}</p>
                  <StatusBadge>
                    {occurrenceLabels[x.occurrence_status ?? ""] ?? x.occurrence_status}
                  </StatusBadge>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sem ocorrência vinculada.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Plano</p>
              {x.plan_id ? (
                <>
                  <p className="mt-2 font-semibold">{x.plan_action}</p>
                  <p className="mt-1 text-sm">{x.responsible ?? "Sem responsável"}</p>
                  <StatusBadge tone={x.plan_status === "concluido" ? "positive" : "neutral"}>
                    {planLabels[x.plan_status ?? ""] ?? x.plan_status}
                  </StatusBadge>
                  {x.plan_result && (
                    <p className="mt-2 text-sm">
                      <strong>Resultado:</strong> {x.plan_result}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sem plano vinculado.</p>
              )}
            </div>
          </article>
        ))}
        {!data.evidence.length && <EmptyText />}
      </div>
    </GlassPanel>
  );
}
function GroupList({
  items,
  labels = {},
}: {
  items: Array<{ label: string; count: number }>;
  labels?: Record<string, string>;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {items.map((x) => (
        <div key={x.label} className="flex justify-between rounded-md bg-muted p-3 text-sm">
          <span>{labels[x.label] ?? x.label}</span>
          <strong>{x.count}</strong>
        </div>
      ))}
    </div>
  );
}
function Footer() {
  return (
    <GlassPanel className="mt-5">
      <p className="text-xs font-semibold uppercase text-primary">Metodologia CartoQuali</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Períodos usam limites semiabertos no fuso America/Sao_Paulo. Satisfação considera notas 4–5;
        negativas, notas 1–3. Dados de contato não integram relatórios nem CSV.
      </p>
    </GlassPanel>
  );
}
function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function EmptyText() {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      Sem dados suficientes no período selecionado.
    </p>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <Field label={label}>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((x) => (
          <option key={x || "all"} value={x}>
            {labels[x] ?? x}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
function periodLabel(filters: RealReportFilters) {
  if (filters.period === "Personalizado")
    return `${filters.startDate ?? "—"} a ${filters.endDate ?? "—"}`;
  return periods.find((x) => x === filters.period) ?? filters.period;
}
// Printed with the report, since the filter bar itself is hidden on paper.
function filtersLabel(filters: RealReportFilters, data: QualityReportData) {
  const parts = [
    `Ponto: ${filters.pointId ? (data.filters.points.find((x) => x.id === filters.pointId)?.name ?? "—") : "Todos"}`,
    `Pesquisa: ${filters.surveyId ? (data.filters.surveys.find((x) => x.id === filters.surveyId)?.name ?? "—") : "Todas"}`,
  ];
  if (filters.occurrenceStatus)
    parts.push(
      `Ocorrências: ${occurrenceLabels[filters.occurrenceStatus] ?? filters.occurrenceStatus}`,
    );
  if (filters.planStatus)
    parts.push(`Planos: ${planLabels[filters.planStatus] ?? filters.planStatus}`);
  return parts.join(" · ");
}
function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
