import { formatPhoneBR, plural } from "@/lib/format";
import { userMessage } from "@/lib/user-message";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilterX,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createOccurrence,
  getOccurrenceDetail,
  listOccurrences,
  updateOccurrence,
} from "@/lib/occurrences.functions";
import { getEvaluationDetail } from "@/lib/evaluations.functions";
import { REASON_CATEGORY, REASON_LABELS, reasonCodes } from "@/lib/reasons";
import { can } from "@/lib/permissions";
import { endOfDayBrasilia, startOfDayBrasilia, todayBrasilia } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { DialogLayer } from "./dialog-layer";
import { GlassPanel, InterfaceState, PageHeader, Stars, StatusBadge } from "./primitives";
import { QualityNavigation } from "./quality-navigation";

const labels = {
  status: {
    nova: "Nova",
    em_analise: "Em análise",
    em_tratamento: "Em tratamento",
    resolvida: "Resolvida",
    encerrada: "Encerrada",
  },
  priority: { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" },
  category: {
    atendimento: "Atendimento",
    tempo: "Tempo",
    clareza: "Clareza",
    resolutividade: "Resolutividade",
    estrutura: "Estrutura",
    processo: "Processo",
    outro: "Outro",
  },
  origin: {
    avaliacao_usuario: "Avaliação de usuário",
    indicador: "Indicador",
    equipe_cartorio: "Equipe do cartório",
    auditoria_interna: "Auditoria interna",
    outro: "Outro",
  },
} as const;
type Status = keyof typeof labels.status;
type Priority = keyof typeof labels.priority;
type Category = keyof typeof labels.category;
type Origin = keyof typeof labels.origin;
type ListItem = {
  id: string;
  avaliacao_id: string | null;
  ponto_id: string | null;
  titulo: string;
  categoria: string;
  descricao: string;
  prioridade: string;
  responsavel_id: string | null;
  status: string;
  origem: string;
  prazo: string | null;
  data_abertura: string;
  data_resolucao: string | null;
  observacao: string | null;
  updated_at: string;
  pointName: string | null;
  responsibleName: string | null;
};
type Filters = {
  status: string;
  priority: string;
  responsibleId: string;
  category: string;
  evaluationId: string;
  startDate: string;
  endDate: string;
};
const emptyFilters: Filters = {
  status: "",
  priority: "",
  responsibleId: "",
  category: "",
  evaluationId: "",
  startDate: "",
  endDate: "",
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
const errorMessage = (error: unknown) =>
  userMessage(error, "Não foi possível concluir a operação.");

export function OccurrencesPage() {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const canManage = can(currentRole, "occurrences", "manage");
  // Read-only profiles never open the form, even when arriving from an evaluation link.
  const linkedEvaluationId = canManage ? (new URLSearchParams(searchStr).get("review") ?? "") : "";
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listOccurrences);
  const fetchDetail = useServerFn(getOccurrenceDetail);
  const fetchEvaluation = useServerFn(getEvaluationDetail);
  const createFn = useServerFn(createOccurrence);
  const updateFn = useServerFn(updateOccurrence);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(Boolean(linkedEvaluationId));
  const pageSize = 10;
  const params = {
    page,
    pageSize,
    ...(applied.status ? { status: applied.status as Status } : {}),
    ...(applied.priority ? { priority: applied.priority as Priority } : {}),
    ...(applied.responsibleId ? { responsibleId: applied.responsibleId } : {}),
    ...(applied.category ? { category: applied.category as Category } : {}),
    ...(applied.evaluationId ? { evaluationId: applied.evaluationId } : {}),
    ...(applied.startDate ? { startDate: startOfDayBrasilia(applied.startDate) } : {}),
    ...(applied.endDate ? { endDate: endOfDayBrasilia(applied.endDate) } : {}),
  };
  const list = useQuery({
    queryKey: ["occurrences", params],
    queryFn: () => fetchList({ data: params }),
  });
  const detail = useQuery({
    queryKey: ["occurrence-detail", selectedId],
    queryFn: () => fetchDetail({ data: { id: selectedId ?? "" } }),
    enabled: Boolean(selectedId),
  });
  const sourceEvaluation = useQuery({
    queryKey: ["evaluation-detail", linkedEvaluationId],
    queryFn: () => fetchEvaluation({ data: { id: linkedEvaluationId } }),
    enabled: Boolean(linkedEvaluationId),
  });
  // The ?review= link only opens the form once: drop it so a later "Nova ocorrência" starts blank.
  const closeForm = () => {
    setCreating(false);
    if (linkedEvaluationId) void navigate({ to: "/ocorrencias", search: {}, replace: true });
  };
  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      closeForm();
      toast.success("Ocorrência criada com sucesso");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
        queryClient.invalidateQueries({ queryKey: ["occurrence-detail", selectedId] }),
      ]);
      setSelectedId(undefined);
      toast.success("Ocorrência atualizada");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  useEffect(() => {
    if (linkedEvaluationId) setCreating(true);
  }, [linkedEvaluationId]);
  const items = (list.data?.items ?? []) as ListItem[];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  const summary = list.data?.summary;
  const metrics = [
    ["Total", list.data?.total ?? "—", AlertCircle],
    ["Em tratamento", summary?.inTreatment ?? "—", Clock3],
    ["Críticas", summary?.critical ?? "—", AlertCircle],
    ["Concluídas", summary?.concluded ?? "—", CheckCircle2],
  ] as const;
  const applyFilters = () => {
    setApplied(filters);
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Melhoria contínua"
        title="Ocorrências de Qualidade"
        description="Registre, analise e trate problemas com histórico preservado."
        action={
          canManage ? (
            <Button onClick={() => setCreating(true)} data-tour="occurrences-new">
              <Plus />
              Nova ocorrência
            </Button>
          ) : undefined
        }
      />
      <QualityNavigation />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <GlassPanel key={label} className="p-4">
            <Icon className="size-5 text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-3xl font-bold">{value}</p>
          </GlassPanel>
        ))}
      </div>
      <OccurrenceFilters
        filters={filters}
        setFilters={setFilters}
        users={list.data?.users ?? []}
        onApply={applyFilters}
        onClear={clearFilters}
      />
      {list.isLoading ? (
        <GlassPanel className="mt-4">
          <InterfaceState
            kind="loading"
            title="Carregando ocorrências"
            description="Buscando os registros do seu cartório."
          />
        </GlassPanel>
      ) : list.isError ? (
        <GlassPanel className="mt-4">
          <InterfaceState
            kind="error"
            title="Não foi possível carregar as ocorrências"
            description="Sua sessão pode ter expirado ou o serviço está indisponível."
            action={
              <Button variant="outline" onClick={() => void list.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </GlassPanel>
      ) : !items.length ? (
        <GlassPanel className="mt-4">
          <InterfaceState
            kind="empty"
            title="Nenhuma ocorrência encontrada"
            description="Não há registros para os filtros selecionados."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        </GlassPanel>
      ) : (
        <>
          <OccurrenceList items={items} onSelect={setSelectedId} />
          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
            <p className="text-muted-foreground">
              {plural(list.data?.total ?? 0, "ocorrência", "ocorrências")} · página {page} de{" "}
              {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || list.isFetching}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || list.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
      {/* Waits for the linked evaluation: the form reads it only once, to pre-fill its fields. */}
      {creating && canManage && !(linkedEvaluationId && sourceEvaluation.isLoading) && (
        <OccurrenceForm
          evaluation={sourceEvaluation.data ?? null}
          evaluationId={linkedEvaluationId}
          users={list.data?.users ?? []}
          points={list.data?.points ?? []}
          saving={createMutation.isPending}
          onClose={closeForm}
          onSubmit={(data) => createMutation.mutate({ data })}
        />
      )}
      {selectedId && (
        <OccurrenceDetail
          data={detail.data}
          loading={detail.isLoading}
          failed={detail.isError}
          saving={updateMutation.isPending}
          onRetry={() => void detail.refetch()}
          onClose={() => setSelectedId(undefined)}
          users={list.data?.users ?? []}
          onSave={(data) => updateMutation.mutate({ data })}
        />
      )}
    </div>
  );
}

function OccurrenceFilters({
  filters,
  setFilters,
  users,
  onApply,
  onClear,
}: {
  filters: Filters;
  setFilters: (value: Filters) => void;
  users: Array<{ id: string; nome: string }>;
  onApply(): void;
  onClear(): void;
}) {
  const set = (key: keyof Filters, value: string) => setFilters({ ...filters, [key]: value });
  return (
    <GlassPanel className="mt-4" tour="occurrences-filters">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Status"
          value={filters.status}
          onChange={(v) => set("status", v)}
          options={["", ...Object.keys(labels.status)]}
          names={{ "": "Todos os status", ...labels.status }}
        />
        <Select
          label="Prioridade"
          value={filters.priority}
          onChange={(v) => set("priority", v)}
          options={["", ...Object.keys(labels.priority)]}
          names={{ "": "Todas as prioridades", ...labels.priority }}
        />
        <Select
          label="Categoria"
          value={filters.category}
          onChange={(v) => set("category", v)}
          options={["", ...Object.keys(labels.category)]}
          names={{ "": "Todas as categorias", ...labels.category }}
        />
        <Select
          label="Responsável"
          value={filters.responsibleId}
          onChange={(v) => set("responsibleId", v)}
          options={["", ...users.map((u) => u.id)]}
          names={{
            "": "Todos os responsáveis",
            ...Object.fromEntries(users.map((u) => [u.id, u.nome])),
          }}
        />
        <Field label="Avaliação relacionada">
          <Input
            value={filters.evaluationId}
            onChange={(e) => set("evaluationId", e.target.value)}
            placeholder="ID da avaliação"
          />
        </Field>
        <Field label="De">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Field>
        <Field label="Até">
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </Field>
        <div className="flex items-end gap-2">
          <Button onClick={onApply}>Aplicar</Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Limpar filtros"
            title="Limpar filtros"
            onClick={onClear}
          >
            <FilterX />
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}

function OccurrenceList({
  items,
  onSelect,
}: {
  items: ListItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div
        data-tour="occurrences-list"
        className="mt-4 hidden overflow-x-auto rounded-lg border border-glass-border bg-glass shadow-glass md:block"
      >
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-glass-border bg-glass-strong text-xs text-muted-foreground">
            <tr>
              {[
                "Ocorrência",
                "Categoria",
                "Prioridade",
                "Responsável",
                "Status",
                "Abertura",
                "Prazo",
                "",
              ].map((item) => (
                <th key={item} className="px-3 py-3">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                tabIndex={0}
                className="cursor-pointer border-b border-glass-border last:border-0 hover:bg-glass-strong focus-visible:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => onSelect(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item.id);
                  }
                }}
              >
                <td className="max-w-72 px-3 py-4">
                  <p className="font-medium">{item.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.id.slice(0, 8)} · {item.pointName ?? "Sem ponto"}
                  </p>
                </td>
                <td className="px-3 py-4">
                  {labels.category[item.categoria as Category] ?? item.categoria}
                </td>
                <td className="px-3 py-4">
                  <PriorityBadge value={item.prioridade as Priority} />
                </td>
                <td className="px-3 py-4">{item.responsibleName ?? "Não definido"}</td>
                <td className="px-3 py-4">
                  <StatusBadge tone={statusTone(item.status as Status)}>
                    {labels.status[item.status as Status] ?? item.status}
                  </StatusBadge>
                </td>
                <td className="px-3 py-4">{formatDate(item.data_abertura)}</td>
                <td className="px-3 py-4">
                  {item.prazo
                    ? new Date(`${item.prazo}T12:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td>
                  <ChevronRight className="size-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div data-tour="occurrences-list" className="mt-4 grid gap-3 md:hidden">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            className="h-auto justify-start whitespace-normal p-4 text-left"
            onClick={() => onSelect(item.id)}
          >
            <span className="w-full">
              <span className="flex items-start justify-between gap-3">
                <strong>{item.titulo}</strong>
                <StatusBadge tone={statusTone(item.status as Status)}>
                  {labels.status[item.status as Status]}
                </StatusBadge>
              </span>
              <span className="mt-2 block text-sm text-muted-foreground">{item.descricao}</span>
              <span className="mt-3 flex justify-between text-xs">
                <PriorityBadge value={item.prioridade as Priority} />
                <span>{item.responsibleName ?? "Não definido"}</span>
              </span>
            </span>
          </Button>
        ))}
      </div>
    </>
  );
}

function OccurrenceForm({
  evaluation,
  evaluationId,
  users,
  points,
  saving,
  onClose,
  onSubmit,
}: {
  evaluation: any;
  evaluationId: string;
  users: Array<{ id: string; nome: string }>;
  points: Array<{ id: string; nome: string }>;
  saving: boolean;
  onClose(): void;
  onSubmit: (data: {
    requestId: string;
    title: string;
    description: string;
    category: Category;
    priority: Priority;
    origin: Origin;
    evaluationId?: string;
    pointId?: string;
    responsibleId?: string;
    dueDate?: string;
    observation?: string;
  }) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  // Reasons picked by the citizen (ratings 1–3) suggest the description and category.
  const reasons = reasonCodes(evaluation?.reasons);
  const reasonLine = reasons.length
    ? `O que o cidadão indicou para melhorar: ${reasons.map((code) => REASON_LABELS[code]).join(", ")}.`
    : "";
  const [form, setForm] = useState({
    title: evaluation ? `Ponto de atenção na avaliação ${evaluation.id.slice(0, 8)}` : "",
    description: [evaluation?.comment ?? "", reasonLine].filter(Boolean).join("\n\n"),
    category: (reasons[0] ? REASON_CATEGORY[reasons[0]] : "atendimento") as Category,
    priority: (evaluation?.rating <= 2 ? "alta" : "media") as Priority,
    origin: (evaluationId ? "avaliacao_usuario" : "equipe_cartorio") as Origin,
    pointId: evaluation?.pointId ?? "",
    responsibleId: "",
    dueDate: "",
    observation: "",
  });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      requestId,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      origin: form.origin,
      ...(evaluationId ? { evaluationId } : {}),
      ...(!evaluationId && form.pointId ? { pointId: form.pointId } : {}),
      ...(form.responsibleId ? { responsibleId: form.responsibleId } : {}),
      ...(form.dueDate ? { dueDate: form.dueDate } : {}),
      ...(form.observation ? { observation: form.observation } : {}),
    });
  };
  return (
    <Overlay title="Nova ocorrência" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {evaluationId && (
          <div className="sm:col-span-2 rounded-md bg-muted p-3 text-sm">
            <strong>Avaliação vinculada:</strong> {evaluationId.slice(0, 8)}
            {evaluation && (
              <>
                {" "}
                · {evaluation.rating}/5 · {evaluation.pointName}
              </>
            )}
          </div>
        )}
        <Field label="Título *">
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
            maxLength={160}
          />
        </Field>
        <Select
          label="Categoria *"
          value={form.category}
          onChange={(v) => set("category", v)}
          options={Object.keys(labels.category)}
          names={labels.category}
        />
        <Field label="Descrição *" wide>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            required
            maxLength={4000}
          />
        </Field>
        <Select
          label="Prioridade *"
          value={form.priority}
          onChange={(v) => set("priority", v)}
          options={Object.keys(labels.priority)}
          names={labels.priority}
        />
        {!evaluationId && (
          <Select
            label="Origem *"
            value={form.origin}
            onChange={(v) => set("origin", v)}
            options={Object.keys(labels.origin)}
            names={labels.origin}
          />
        )}{" "}
        {!evaluationId && (
          <Select
            label="Ponto"
            value={form.pointId}
            onChange={(v) => set("pointId", v)}
            options={["", ...points.map((p) => p.id)]}
            names={{ "": "Nenhum", ...Object.fromEntries(points.map((p) => [p.id, p.nome])) }}
          />
        )}
        <Select
          label="Responsável"
          value={form.responsibleId}
          onChange={(v) => set("responsibleId", v)}
          options={["", ...users.map((u) => u.id)]}
          names={{ "": "Não definido", ...Object.fromEntries(users.map((u) => [u.id, u.nome])) }}
        />
        <Field label="Prazo">
          <Input
            type="date"
            value={form.dueDate}
            min={todayBrasilia()}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </Field>
        <Field label="Observações" wide>
          <Textarea
            value={form.observation}
            onChange={(e) => set("observation", e.target.value)}
            maxLength={4000}
          />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Criar ocorrência"}
          </Button>
        </div>
      </form>
    </Overlay>
  );
}

function OccurrenceDetail({
  data,
  loading,
  failed,
  saving,
  users,
  onRetry,
  onClose,
  onSave,
}: {
  data: any;
  loading: boolean;
  failed: boolean;
  saving: boolean;
  users: Array<{ id: string; nome: string }>;
  onRetry(): void;
  onClose(): void;
  onSave: (data: {
    id: string;
    expectedUpdatedAt: string;
    title: string;
    description: string;
    category: Category;
    priority: Priority;
    responsibleId: string | null;
    status: Status;
    dueDate: string | null;
    observation: string | null;
  }) => void;
}) {
  if (loading)
    return (
      <Overlay title="Ocorrência" onClose={onClose}>
        <InterfaceState
          kind="loading"
          title="Carregando ocorrência"
          description="Buscando origem, tratamento e histórico."
        />
      </Overlay>
    );
  if (failed)
    return (
      <Overlay title="Ocorrência" onClose={onClose}>
        <InterfaceState
          kind="error"
          title="Não foi possível abrir a ocorrência"
          description="Tente novamente."
          action={
            <Button variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          }
        />
      </Overlay>
    );
  if (!data)
    return (
      <Overlay title="Ocorrência" onClose={onClose}>
        <InterfaceState
          kind="empty"
          title="Ocorrência não encontrada"
          description="O registro não existe ou não pertence ao seu cartório."
        />
      </Overlay>
    );
  return (
    <OccurrenceEditor
      key={data.updated_at}
      data={data}
      saving={saving}
      users={users}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function OccurrenceEditor({
  data,
  saving,
  users,
  onClose,
  onSave,
}: {
  data: any;
  saving: boolean;
  users: Array<{ id: string; nome: string }>;
  onClose(): void;
  onSave: (data: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: data.titulo,
    description: data.descricao,
    category: data.categoria as Category,
    priority: data.prioridade as Priority,
    responsibleId: data.responsavel_id ?? "",
    status: data.status as Status,
    dueDate: data.prazo ?? "",
    observation: data.observacao ?? "",
  });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const nextStatuses = allowedStatuses(data.status as Status);
  const save = () =>
    onSave({
      id: data.id,
      expectedUpdatedAt: data.updated_at,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      responsibleId: form.responsibleId || null,
      status: form.status,
      dueDate: form.dueDate || null,
      observation: form.observation || null,
    });
  return (
    <Overlay title={`${data.id.slice(0, 8)} · ${data.titulo}`} onClose={onClose}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={statusTone(data.status)}>
              {labels.status[data.status as Status]}
            </StatusBadge>
            <PriorityBadge value={data.prioridade} />
            <StatusBadge>{labels.origin[data.origem as Origin] ?? data.origem}</StatusBadge>
          </div>
          {editing && data.canManage ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Select
                label="Categoria"
                value={form.category}
                onChange={(v) => set("category", v)}
                options={Object.keys(labels.category)}
                names={labels.category}
              />
              <Field label="Descrição" wide>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Select
                label="Prioridade"
                value={form.priority}
                onChange={(v) => set("priority", v)}
                options={Object.keys(labels.priority)}
                names={labels.priority}
              />
              <Select
                label="Responsável"
                value={form.responsibleId}
                onChange={(v) => set("responsibleId", v)}
                options={["", ...users.map((u) => u.id)]}
                names={{
                  "": "Não definido",
                  ...Object.fromEntries(users.map((u) => [u.id, u.nome])),
                }}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(v) => set("status", v)}
                options={nextStatuses}
                names={labels.status}
              />
              <Field label="Prazo">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </Field>
              <Field label="Tratamento / observações" wide>
                <Textarea
                  value={form.observation}
                  onChange={(e) => set("observation", e.target.value)}
                  placeholder="Obrigatório para resolver ou encerrar"
                />
              </Field>
              <div className="flex gap-2 sm:col-span-2">
                <Button disabled={saving} onClick={save}>
                  {saving ? "Salvando…" : "Salvar alterações"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm">{data.descricao}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Categoria" value={labels.category[data.categoria as Category]} />
                <Info label="Ponto" value={data.pointName ?? "Não informado"} />
                <Info label="Responsável" value={data.responsibleName ?? "Não definido"} />
                <Info
                  label="Prazo"
                  value={
                    data.prazo
                      ? new Date(`${data.prazo}T12:00:00`).toLocaleDateString("pt-BR")
                      : "Não definido"
                  }
                />
                <Info label="Criada por" value={data.creatorName ?? "Sistema"} />
                <Info label="Atualizada em" value={formatDate(data.updated_at)} />
              </div>
              {data.observacao && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <strong>Tratamento:</strong>
                  <p className="mt-1">{data.observacao}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {data.canManage && (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Editar e tratar
                  </Button>
                )}
                {data.canManage && (
                  <Button asChild>
                    <Link to="/planos-melhoria" search={{ occurrence: data.id }}>
                      Criar plano de melhoria
                    </Link>
                  </Button>
                )}
              </div>
              {!data.canManage && (
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Seu perfil possui acesso somente para consulta.
                </p>
              )}
            </>
          )}
          {data.evaluation && <EvaluationOrigin evaluation={data.evaluation} />}
        </div>
        <div>
          <h3 className="font-display font-bold">Histórico da ocorrência</h3>
          <ol className="mt-4 border-l-2 border-primary/25 pl-5">
            {data.history.map((event: any) => (
              <li
                key={event.id}
                className="relative pb-6 before:absolute before:-left-[27px] before:top-1 before:size-3 before:rounded-full before:bg-primary"
              >
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.createdAt)} · {event.userName}
                </p>
                <p className="font-semibold">{historyLabel(event.action)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Overlay>
  );
}

function EvaluationOrigin({ evaluation }: { evaluation: any }) {
  return (
    <GlassPanel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold">Avaliação de origem</h3>
          <p className="text-xs text-muted-foreground">
            {evaluation.anonymous ? "Sem identificação cadastral" : "Contato solicitado"} ·{" "}
            {formatDate(evaluation.createdAt)}
          </p>
        </div>
        <Stars value={evaluation.rating} size="sm" />
      </div>
      <p className="mt-3 text-sm">
        {evaluation.pointName} · {evaluation.surveyName}
      </p>
      {evaluation.comment && (
        <blockquote className="mt-3 border-l-2 border-primary pl-3 text-sm">
          “{evaluation.comment}”
        </blockquote>
      )}
      {evaluation.answers.length > 0 && (
        <div className="mt-3 space-y-2">
          {evaluation.answers.map((answer: any) => (
            <div key={answer.id} className="text-sm">
              <strong>{answer.question}</strong>
              <p className="text-muted-foreground">{answer.value || "Sem resposta"}</p>
            </div>
          ))}
        </div>
      )}
      {evaluation.contact && (
        <p className="mt-3 rounded-md bg-muted p-3 text-sm">
          <strong>Contato solicitado:</strong>{" "}
          {[
            evaluation.contact.name,
            formatPhoneBR(evaluation.contact.phone),
            evaluation.contact.email,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {evaluation.contactRestricted && (
        <p className="mt-3 text-sm text-muted-foreground">
          Dados de contato restritos aos administradores autorizados.
        </p>
      )}
    </GlassPanel>
  );
}

function allowedStatuses(current: Status): Status[] {
  const values = Object.keys(labels.status) as Status[];
  const index = values.indexOf(current);
  return values.filter((_, candidate) => candidate === index || candidate === index + 1);
}
function historyLabel(action: string) {
  return (
    (
      {
        occurrence_created: "Ocorrência criada",
        occurrence_updated: "Ocorrência atualizada",
        occurrence_assigned: "Responsável alterado",
        occurrence_status_changed: "Status alterado",
        occurrence_closed: "Ocorrência encerrada",
      } as Record<string, string>
    )[action] ?? action
  );
}
function PriorityBadge({ value }: { value: Priority }) {
  return (
    <StatusBadge tone={value === "critica" ? "danger" : value === "alta" ? "warning" : "neutral"}>
      {labels.priority[value] ?? value}
    </StatusBadge>
  );
}
function statusTone(status: Status): "positive" | "warning" | "danger" | "neutral" {
  return status === "resolvida" || status === "encerrada"
    ? "positive"
    : status === "nova"
      ? "danger"
      : status === "em_tratamento"
        ? "warning"
        : "neutral";
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-medium", wide && "sm:col-span-2")}>
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
  names,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  names: Record<string, string>;
}) {
  return (
    <Field label={label}>
      <select
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((item) => (
          <option key={item || "empty"} value={item}>
            {names[item] ?? item}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
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
    <DialogLayer
      label={title}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/25 p-4"
    >
      <div className="mx-auto my-6 w-full max-w-5xl rounded-lg border border-glass-border bg-background p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <Button size="icon" variant="ghost" aria-label="Fechar" onClick={onClose}>
            <X />
          </Button>
        </div>
        {children}
      </div>
    </DialogLayer>
  );
}
