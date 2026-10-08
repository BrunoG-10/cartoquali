import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Plus, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth-provider";
import { can } from "@/lib/permissions";
import {
  createPrivacyRequest,
  listPrivacyRequests,
  minimizeEvaluationData,
  updatePrivacyRequest,
} from "@/lib/privacy.functions";
import { GlassPanel, InterfaceState, PageHeader, StatusBadge } from "./primitives";

const types = {
  confirmacao: "Confirmação",
  acesso: "Acesso",
  correcao: "Correção",
  informacao: "Informação",
  eliminacao: "Eliminação",
  oposicao: "Oposição",
  revogacao: "Revogação",
  outro: "Outro",
} as const;
const statuses = {
  recebida: "Recebida",
  em_analise: "Em análise",
  aguardando_validacao: "Aguardando validação",
  concluida: "Concluída",
  indeferida: "Indeferida",
  cancelada: "Cancelada",
} as const;
type RequestType = keyof typeof types;
type RequestStatus = keyof typeof statuses;

export function PrivacyRequestsPage() {
  const { currentRole } = useAuth();
  const allowed = can(currentRole, "privacy", "manage");
  const load = useServerFn(listPrivacyRequests);
  const create = useServerFn(createPrivacyRequest);
  const update = useServerFn(updatePrivacyRequest);
  const minimize = useServerFn(minimizeEvaluationData);
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    requestType: "acesso" as RequestType,
    description: "",
    requesterContact: "",
    evaluationId: "",
    responsibleUserId: "",
  });
  const query = useQuery({
    queryKey: ["privacy-requests", page, status, requestType],
    queryFn: () =>
      load({
        data: {
          page,
          pageSize: 10,
          ...(status ? { status: status as RequestStatus } : {}),
          ...(requestType ? { requestType: requestType as RequestType } : {}),
        },
      }),
    enabled: allowed,
  });
  const refresh = async () => client.invalidateQueries({ queryKey: ["privacy-requests"] });
  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          requestType: draft.requestType,
          description: draft.description,
          ...(draft.requesterContact ? { requesterContact: draft.requesterContact } : {}),
          ...(draft.evaluationId ? { evaluationId: draft.evaluationId } : {}),
          ...(draft.responsibleUserId ? { responsibleUserId: draft.responsibleUserId } : {}),
        },
      }),
    onSuccess: async () => {
      setCreating(false);
      setDraft({
        requestType: "acesso",
        description: "",
        requesterContact: "",
        evaluationId: "",
        responsibleUserId: "",
      });
      await refresh();
      toast.success("Solicitação registrada");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar."),
  });
  if (!allowed)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Acesso restrito"
          description="Somente administradores podem tratar solicitações de privacidade."
        />
      </GlassPanel>
    );
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Governança de dados"
        title="Solicitações de privacidade"
        description="Registre e acompanhe pedidos sem armazenar documentos pessoais desnecessários."
        action={
          <Button onClick={() => setCreating((value) => !value)} data-tour="privacy-new">
            <Plus />
            {creating ? "Cancelar" : "Nova solicitação"}
          </Button>
        }
      />
      {creating && (
        <GlassPanel className="mb-4">
          <h2 className="font-display text-lg font-bold">Registrar solicitação</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Tipo
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
                value={draft.requestType}
                onChange={(event) =>
                  setDraft({ ...draft, requestType: event.target.value as RequestType })
                }
              >
                {Object.entries(types).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Contato informado
              <Input
                className="mt-1.5"
                maxLength={255}
                value={draft.requesterContact}
                onChange={(event) => setDraft({ ...draft, requesterContact: event.target.value })}
                placeholder="E-mail ou telefone, se necessário"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Descrição
              <Textarea
                className="mt-1.5"
                maxLength={4000}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <label className="text-sm font-medium">
              Avaliação relacionada
              <Input
                className="mt-1.5"
                value={draft.evaluationId}
                onChange={(event) =>
                  setDraft({ ...draft, evaluationId: event.target.value.trim() })
                }
                placeholder="UUID, quando aplicável"
              />
            </label>
            <label className="text-sm font-medium">
              Responsável
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
                value={draft.responsibleUserId}
                onChange={(event) => setDraft({ ...draft, responsibleUserId: event.target.value })}
              >
                <option value="">Não atribuído</option>
                {query.data?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button
            className="mt-4"
            disabled={createMutation.isPending || draft.description.trim().length < 3}
            onClick={() => createMutation.mutate()}
          >
            <Save />
            {createMutation.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </GlassPanel>
      )}
      <GlassPanel className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Status
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Tipo
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
              value={requestType}
              onChange={(event) => {
                setRequestType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(types).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </GlassPanel>
      {query.isLoading ? (
        <GlassPanel>
          <InterfaceState
            kind="loading"
            title="Carregando solicitações"
            description="Consultando o histórico protegido."
          />
        </GlassPanel>
      ) : query.isError ? (
        <GlassPanel>
          <InterfaceState
            kind="error"
            title="Solicitações indisponíveis"
            description={query.error instanceof Error ? query.error.message : "Tente novamente."}
          />
        </GlassPanel>
      ) : query.data?.rows.length ? (
        <>
          <div data-tour="privacy-list" className="space-y-3">
            {query.data.rows.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                users={query.data.users}
                onUpdate={async (data) => {
                  await update({ data });
                  await refresh();
                }}
                onMinimize={async (redactFreeText) => {
                  if (!request.evaluation_id)
                    throw new Error("Vincule uma avaliação antes de minimizar dados.");
                  await minimize({
                    data: {
                      requestId: request.id,
                      evaluationId: request.evaluation_id,
                      redactFreeText,
                    },
                  });
                  await refresh();
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {page} de {pages} · {query.data.total} solicitações
            </span>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                aria-label="Página anterior"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Próxima página"
                disabled={page >= pages}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <GlassPanel>
          <InterfaceState
            kind="empty"
            title="Nenhuma solicitação"
            description="As solicitações registradas aparecerão aqui."
          />
        </GlassPanel>
      )}
    </div>
  );
}

function RequestCard({
  request,
  users,
  onUpdate,
  onMinimize,
}: {
  request: any;
  users: Array<{ id: string; nome: string }>;
  onUpdate(data: {
    id: string;
    status: RequestStatus;
    responsibleUserId: string | null;
    internalNotes: string | null;
  }): Promise<void>;
  onMinimize(redact: boolean): Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [responsible, setResponsible] = useState(request.responsible_user_id ?? "");
  const [notes, setNotes] = useState(request.internal_notes ?? "");
  const [pending, setPending] = useState(false);
  const save = async () => {
    setPending(true);
    try {
      await onUpdate({
        id: request.id,
        status,
        responsibleUserId: responsible || null,
        internalNotes: notes.trim() || null,
      });
      setEditing(false);
      toast.success("Solicitação atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    } finally {
      setPending(false);
    }
  };
  const minimize = async () => {
    if (
      !window.confirm(
        "Remover o contato e redigir os textos livres desta avaliação? Notas e respostas estruturadas serão preservadas.",
      )
    )
      return;
    setPending(true);
    try {
      await onMinimize(true);
      toast.success("Dados pessoais minimizados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível minimizar.");
    } finally {
      setPending(false);
    }
  };
  return (
    <GlassPanel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={
                request.status === "concluida"
                  ? "positive"
                  : request.status === "indeferida"
                    ? "danger"
                    : "neutral"
              }
            >
              {statuses[request.status as RequestStatus] ?? request.status}
            </StatusBadge>
            <strong>{types[request.request_type as RequestType] ?? request.request_type}</strong>
          </div>
          <p className="mt-2 text-sm">{request.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Registrada em {new Date(request.created_at).toLocaleString("pt-BR")} · Responsável:{" "}
            {request.responsible_name ?? "não atribuído"}
          </p>
          {request.requester_contact && (
            <p className="mt-2 text-xs text-muted-foreground">
              Contato restrito registrado para tratamento administrativo.
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => setEditing((value) => !value)}>
          {editing ? "Fechar" : "Tratar"}
        </Button>
      </div>
      {editing && (
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Status
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
              value={status}
              onChange={(event) => setStatus(event.target.value as RequestStatus)}
            >
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Responsável
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
              value={responsible}
              onChange={(event) => setResponsible(event.target.value)}
            >
              <option value="">Não atribuído</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Observações internas
            <Textarea
              className="mt-1.5"
              maxLength={4000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button disabled={pending} onClick={() => void save()}>
              <Save />
              Salvar tratamento
            </Button>
            {request.evaluation_id && (
              <Button variant="outline" disabled={pending} onClick={() => void minimize()}>
                <ShieldCheck />
                Minimizar dados da avaliação
              </Button>
            )}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
