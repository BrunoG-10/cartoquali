import { formatPhoneBR, plural } from "@/lib/format";
import { userMessage } from "@/lib/user-message";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  LockKeyhole,
  PhoneCall,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getEvaluationDetail,
  listEvaluations,
  updateEvaluationStatus,
} from "@/lib/evaluations.functions";
import { describeAnswer } from "@/lib/multiple-choice";
import { can } from "@/lib/permissions";
import { endOfDayBrasilia, startOfDayBrasilia } from "@/lib/timestamp";
import { useAuth } from "./auth-provider";
import { DialogLayer } from "./dialog-layer";
import { GlassPanel, InterfaceState, PageHeader, Stars, StatusBadge } from "./primitives";
import { ATTENTION_COUNTS_KEY } from "./use-attention-counts";

type EvaluationStatus = "nova" | "em_analise" | "respondida";
const STATUS_OPTIONS: Array<{ value: EvaluationStatus; label: string }> = [
  { value: "nova", label: "Nova" },
  { value: "em_analise", label: "Em análise" },
  { value: "respondida", label: "Respondida" },
];

/** Selo "Pediu retorno": amarelo enquanto não respondida. */
function ContactBadge({ status }: { status: string }) {
  return (
    <StatusBadge tone={status === "Respondida" ? "neutral" : "warning"}>
      <PhoneCall className="size-3" aria-hidden />
      Pediu retorno
    </StatusBadge>
  );
}

const statusTone = (status: string) =>
  status === "Nova"
    ? ("warning" as const)
    : status === "Respondida"
      ? ("positive" as const)
      : ("neutral" as const);
/** Classificação: 4–5 satisfeita (verde), 3 atenção (amarelo), 1–2 nota ruim (vermelho). */
const ratingTone = (rating: number) =>
  rating >= 4 ? ("positive" as const) : rating === 3 ? ("warning" as const) : ("danger" as const);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );

export function ReviewsPage() {
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const initialSearch = new URLSearchParams(searchStr);
  const fetchList = useServerFn(listEvaluations);
  const fetchDetail = useServerFn(getEvaluationDetail);
  const [page, setPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [pointId, setPointId] = useState(initialSearch.get("point") ?? "");
  const [surveyId, setSurveyId] = useState(initialSearch.get("survey") ?? "");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState(() => {
    const value = initialSearch.get("status") ?? "";
    return STATUS_OPTIONS.some((option) => option.value === value) ? value : "";
  });
  const [classification, setClassification] = useState(initialSearch.get("classification") ?? "");
  const [startDate, setStartDate] = useState(initialSearch.get("start") ?? "");
  const [endDate, setEndDate] = useState(initialSearch.get("end") ?? "");
  const [contactOnly, setContactOnly] = useState(initialSearch.get("retorno") === "1" ? "1" : "");
  const [selectedId, setSelectedId] = useState<string>();
  const pageSize = 10;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(draftSearch.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftSearch]);
  const filters = {
    page,
    pageSize,
    search,
    ...(pointId ? { pointId } : {}),
    ...(surveyId ? { surveyId } : {}),
    ...(rating ? { rating: Number(rating) } : {}),
    ...(status ? { status: status as "nova" | "em_analise" | "respondida" } : {}),
    ...(classification
      ? { classification: classification as "satisfeita" | "atencao" | "ruim" }
      : {}),
    ...(contactOnly ? { contactRequested: true } : {}),
    ...(startDate ? { startDate: startOfDayBrasilia(startDate) } : {}),
    ...(endDate ? { endDate: endOfDayBrasilia(endDate) } : {}),
  };
  const list = useQuery({
    queryKey: ["evaluations", filters],
    queryFn: () => fetchList({ data: filters }),
  });
  const detail = useQuery({
    queryKey: ["evaluation-detail", selectedId],
    queryFn: () => fetchDetail({ data: { id: selectedId ?? "" } }),
    enabled: Boolean(selectedId),
  });
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  const reset = () => {
    setDraftSearch("");
    setSearch("");
    setPointId("");
    setSurveyId("");
    setRating("");
    setStatus("");
    setClassification("");
    setContactOnly("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };
  const update = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Experiência do usuário"
        title="Avaliações"
        description="Consulte avaliações e respostas registradas no seu cartório."
      />
      <GlassPanel className="mb-4" tour="reviews-filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Buscar comentário</span>
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="bg-glass-strong pl-9"
              placeholder="Buscar comentário"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por ponto"
            className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm"
            value={pointId}
            onChange={(event) => update(setPointId, event.target.value)}
          >
            <option value="">Todos os pontos</option>
            {list.data?.points.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por pesquisa"
            className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm"
            value={surveyId}
            onChange={(event) => update(setSurveyId, event.target.value)}
          >
            <option value="">Todas as pesquisas</option>
            {list.data?.surveys.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por nota"
            className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm"
            value={rating}
            onChange={(event) => update(setRating, event.target.value)}
          >
            <option value="">Todas as notas</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {plural(value, "estrela", "estrelas")}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por classificação"
            className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm"
            value={classification}
            onChange={(event) => update(setClassification, event.target.value)}
          >
            <option value="">Todas as classificações</option>
            <option value="satisfeita">Satisfeita</option>
            <option value="atencao">Atenção</option>
            <option value="ruim">Nota 1 ou 2</option>
          </select>
          <select
            aria-label="Filtrar por status"
            className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm"
            value={status}
            onChange={(event) => update(setStatus, event.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="nova">Nova</option>
            <option value="em_analise">Em análise</option>
            <option value="respondida">Respondida</option>
          </select>
          <select
            aria-label="Filtrar por pedido de retorno"
            className="h-9 rounded-md border border-input bg-glass-strong px-3 text-sm"
            value={contactOnly}
            onChange={(event) => update(setContactOnly, event.target.value)}
          >
            <option value="">Com e sem pedido de retorno</option>
            <option value="1">Só quem pediu retorno</option>
          </select>
          <label className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs text-muted-foreground">
            De
            <Input
              type="date"
              value={startDate}
              onChange={(event) => update(setStartDate, event.target.value)}
            />
          </label>
          <label className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs text-muted-foreground">
            Até
            <Input
              type="date"
              value={endDate}
              onChange={(event) => update(setEndDate, event.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={reset}>
            <FilterX />
            Limpar filtros
          </Button>
        </div>
      </GlassPanel>
      {list.isLoading ? (
        <GlassPanel>
          <InterfaceState
            kind="loading"
            title="Carregando avaliações"
            description="Buscando os registros do seu cartório."
          />
        </GlassPanel>
      ) : list.isError ? (
        <GlassPanel>
          <InterfaceState
            kind="error"
            title="Não foi possível carregar as avaliações"
            description="Sua sessão pode ter expirado ou o serviço está indisponível."
            action={
              <Button variant="outline" onClick={() => void list.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </GlassPanel>
      ) : !list.data?.items.length ? (
        <GlassPanel>
          <InterfaceState
            kind="empty"
            title="Nenhuma avaliação encontrada"
            description="Não há avaliações para os filtros selecionados."
            action={
              <Button variant="outline" onClick={reset}>
                Limpar filtros
              </Button>
            }
          />
        </GlassPanel>
      ) : (
        <>
          <div
            data-tour="reviews-list"
            className="hidden overflow-hidden rounded-xl border border-glass-border bg-glass shadow-glass backdrop-blur-xl md:block"
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-glass-border bg-glass-strong text-xs text-muted-foreground">
                <tr>
                  {[
                    "Data",
                    "Nota",
                    "Serviço",
                    "Pesquisa",
                    "Classificação",
                    "Comentário",
                    "Status",
                  ].map((heading) => (
                    <th className="px-4 py-3 font-semibold" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    className="cursor-pointer border-b border-glass-border transition-colors last:border-0 hover:bg-glass-strong"
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(event) => event.key === "Enter" && setSelectedId(item.id)}
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-xs">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Stars value={item.rating} size="sm" />
                    </td>
                    <td className="px-4 py-4 font-medium">
                      {item.serviceName ?? (
                        <span className="font-normal text-muted-foreground">Não informado</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{item.surveyName}</td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={ratingTone(item.rating)}>
                        {item.classification}
                      </StatusBadge>
                    </td>
                    <td className="max-w-56 truncate px-4 py-4">
                      {item.comment || "Sem comentário"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex flex-wrap gap-1">
                        <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                        {item.contactRequested ? <ContactBadge status={item.status} /> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div data-tour="reviews-list" className="grid gap-3 md:hidden">
            {list.data.items.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                onClick={() => setSelectedId(item.id)}
                className="h-auto justify-start whitespace-normal p-4 text-left"
              >
                <span className="w-full">
                  <span className="flex justify-between gap-2">
                    <Stars value={item.rating} size="sm" />
                    <span className="flex flex-wrap justify-end gap-1">
                      {item.contactRequested ? <ContactBadge status={item.status} /> : null}
                      <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                    </span>
                  </span>
                  <span className="mt-3 block font-medium">{item.comment || "Sem comentário"}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {item.serviceName ?? "Serviço não informado"} · {formatDate(item.createdAt)}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
            <p className="text-muted-foreground">
              {plural(list.data.total, "avaliação", "avaliações")} · página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || list.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || list.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
      {selectedId && (
        <DialogLayer
          {...(detail.data ? { labelledBy: "evaluation-title" } : { label: "Avaliação" })}
          onClose={() => setSelectedId(undefined)}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/20 p-4"
        >
          <div
            className="my-4 w-full max-w-2xl rounded-xl border border-glass-border bg-background p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {detail.isLoading ? (
              <InterfaceState
                kind="loading"
                title="Carregando avaliação"
                description="Buscando respostas e informações relacionadas."
              />
            ) : detail.isError ? (
              <InterfaceState
                kind="error"
                title="Não foi possível abrir a avaliação"
                description="Tente novamente ou feche esta janela."
                action={
                  <Button variant="outline" onClick={() => void detail.refetch()}>
                    Tentar novamente
                  </Button>
                }
              />
            ) : !detail.data ? (
              <InterfaceState
                kind="empty"
                title="Avaliação não encontrada"
                description="O registro não existe ou não pertence ao seu cartório."
              />
            ) : (
              <EvaluationDialogContent
                evaluation={detail.data}
                onClose={() => setSelectedId(undefined)}
                onCreateOccurrence={(evaluationId) =>
                  void navigate({ to: "/ocorrencias", search: { review: evaluationId } })
                }
              />
            )}
          </div>
        </DialogLayer>
      )}
    </div>
  );
}

function StatusControl({
  evaluationId,
  status,
  contactRequested,
}: {
  evaluationId: string;
  status: EvaluationStatus;
  contactRequested: boolean;
}) {
  const { currentRole } = useAuth();
  const client = useQueryClient();
  const update = useServerFn(updateEvaluationStatus);
  const mutation = useMutation({
    mutationFn: (next: EvaluationStatus) => update({ data: { id: evaluationId, status: next } }),
    onSuccess: async (_, next) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["evaluations"] }),
        client.invalidateQueries({ queryKey: ["evaluation-detail", evaluationId] }),
        client.invalidateQueries({ queryKey: ATTENTION_COUNTS_KEY }),
      ]);
      toast.success(
        next === "respondida" && contactRequested
          ? "Retorno marcado como feito."
          : "Situação da avaliação atualizada.",
      );
    },
    onError: (e) => toast.error(userMessage(e, "Não foi possível atualizar.")),
  });
  if (!can(currentRole, "evaluations", "manage")) return null;
  return (
    <div className="mt-4 rounded-lg border border-glass-border p-3">
      <p className="text-xs font-semibold text-muted-foreground">Alterar situação</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={status === option.value ? "default" : "outline"}
            aria-pressed={status === option.value}
            disabled={mutation.isPending || status === option.value}
            onClick={() => mutation.mutate(option.value)}
          >
            {option.label}
          </Button>
        ))}
        {contactRequested && status !== "respondida" ? (
          <Button
            size="sm"
            className="sm:ml-auto"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("respondida")}
          >
            <CheckCircle2 />
            Retorno feito
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/70 p-3">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Abre a solicitação de privacidade já vinculada a esta avaliação (só administradores tratam). */
function PrivacyRequestButton({ evaluationId }: { evaluationId: string }) {
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  if (!can(currentRole, "privacy", "manage")) return null;
  return (
    <Button
      variant="outline"
      onClick={() =>
        void navigate({ to: "/solicitacoes-privacidade", search: { avaliacao: evaluationId } })
      }
    >
      <LockKeyhole />
      Solicitação de privacidade
    </Button>
  );
}

/** Só aparece para perfis que podem registrar ocorrências (o Operador apenas consulta). */
function CreateOccurrenceButton({ onClick }: { onClick(): void }) {
  const { currentRole } = useAuth();
  if (!can(currentRole, "occurrences", "manage")) return null;
  return (
    <Button onClick={onClick}>
      <AlertCircle />
      Criar ocorrência
    </Button>
  );
}

function EvaluationDialogContent({
  evaluation,
  onClose,
  onCreateOccurrence,
}: {
  evaluation: any;
  onClose(): void;
  onCreateOccurrence: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="evaluation-title" className="font-display text-lg font-semibold">
            Avaliação {evaluation.id.slice(0, 8)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(evaluation.createdAt)} · {evaluation.serviceName ?? "Serviço não informado"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Info label="Nota geral">
          <Stars value={evaluation.rating} size="sm" />
        </Info>
        <Info label="Classificação">
          <StatusBadge tone={ratingTone(evaluation.rating)}>
            {evaluation.classification}
          </StatusBadge>
        </Info>
        <Info label="Status">
          <StatusBadge tone={statusTone(evaluation.status)}>{evaluation.status}</StatusBadge>
        </Info>
      </div>
      <StatusControl
        evaluationId={evaluation.id}
        status={evaluation.statusValue}
        contactRequested={Boolean(evaluation.contact || evaluation.contactRestricted)}
      />
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Pesquisa</dt>
          <dd className="font-medium">{evaluation.surveyName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Resolutividade</dt>
          <dd className="font-medium">{evaluation.resolution ?? "Não informada"}</dd>
        </div>
      </dl>
      <h3 className="mt-6 font-display font-bold">Respostas</h3>
      {evaluation.answers.length ? (
        <div className="mt-2 divide-y divide-glass-border rounded-lg border">
          {evaluation.answers.map((answer: any) => (
            <div key={answer.id} className="p-4">
              <p className="text-sm font-medium">{answer.question}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {describeAnswer(answer.value, answer.text)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma resposta detalhada foi registrada.
        </p>
      )}
      {evaluation.comment && (
        <>
          <h3 className="mt-6 font-display font-bold">Comentário</h3>
          <blockquote className="mt-2 rounded-lg border border-glass-border bg-glass p-4 text-sm">
            “{evaluation.comment}”
          </blockquote>
        </>
      )}
      {evaluation.dissatisfactionReason && (
        <p className="mt-3 text-sm">
          <strong>Motivo de insatisfação:</strong> {evaluation.dissatisfactionReason}
        </p>
      )}
      {evaluation.contact && (
        <div className="mt-5 rounded-lg bg-muted p-4 text-sm">
          <div className="flex items-center gap-2 font-bold">
            <UserRound className="size-4" />
            Contato solicitado
          </div>
          <p className="mt-2">
            {[
              evaluation.contact.name,
              formatPhoneBR(evaluation.contact.phone),
              evaluation.contact.email,
            ]
              .filter(Boolean)
              .join(" · ") || "Dados não informados"}
          </p>
        </div>
      )}
      {evaluation.contactRestricted && (
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <LockKeyhole className="size-4" />A pessoa pediu retorno. Os dados de contato são
          restritos aos administradores do cartório.
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <PrivacyRequestButton evaluationId={evaluation.id} />
        <CreateOccurrenceButton onClick={() => onCreateOccurrence(evaluation.id)} />
      </div>
    </>
  );
}
