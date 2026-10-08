import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassPanel, InterfaceState, PageHeader, StatusBadge } from "./primitives";
import { listAuditEvents } from "@/lib/audit.functions";
import { AUDIT_ACTION_LABELS, auditActionLabel } from "@/lib/audit-labels";

const entityLabels: Record<string, string> = {
  user: "Usuário",
  registry: "Cartório",
  survey: "Pesquisa",
  question: "Pergunta",
  answer_option: "Opção",
  registry_settings: "Configurações",
  quality_occurrence: "Ocorrência",
  improvement_plan: "Plano",
  evaluation_point: "QR Code",
  registry_service: "Serviço",
  privacy_request: "Solicitação de privacidade",
  evaluation: "Avaliação",
  quality_report: "Relatório",
};

const actionOptions = Object.entries(AUDIT_ACTION_LABELS).sort(([, a], [, b]) =>
  a.localeCompare(b, "pt-BR"),
);

export function AuditPage() {
  const load = useServerFn(listAuditEvents);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const query = useQuery({
    queryKey: ["audit", page, entity, action, startDate, endDate],
    queryFn: () =>
      load({
        data: {
          page,
          pageSize: 25,
          ...(entity ? { entity } : {}),
          ...(action ? { action } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 25));
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Controle operacional"
        title="Auditoria"
        description="Histórico imutável das ações administrativas do seu cartório."
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RotateCw />
            Atualizar
          </Button>
        }
      />
      <GlassPanel className="mb-4" tour="audit-filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">
            Entidade
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {Object.entries(entityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Ação
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {actionOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            De
            <Input
              className="mt-1.5"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm font-medium">
            Até
            <Input
              className="mt-1.5"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      </GlassPanel>
      {query.isLoading ? (
        <GlassPanel>
          <InterfaceState
            kind="loading"
            title="Carregando auditoria"
            description="Consultando o histórico protegido."
          />
        </GlassPanel>
      ) : query.isError ? (
        <GlassPanel>
          <InterfaceState
            kind="error"
            title="Auditoria indisponível"
            description={query.error instanceof Error ? query.error.message : "Tente novamente."}
          />
        </GlassPanel>
      ) : query.data?.rows.length ? (
        <>
          <div data-tour="audit-list" className="space-y-3">
            {query.data.rows.map((event) => (
              <GlassPanel key={event.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge>{entityLabels[event.entity] ?? event.entity}</StatusBadge>
                      <strong className="text-sm" title={event.action}>
                        {auditActionLabel(event.action)}
                      </strong>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {event.usuarios?.nome ?? "Sistema"} ·{" "}
                      {new Date(event.created_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                  </div>
                  <code className="text-xs text-muted-foreground">
                    {event.entity_id?.slice(0, 8) ?? "—"}
                  </code>
                </div>
              </GlassPanel>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {page} de {pages} · {query.data.total} eventos
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
            title="Nenhum evento encontrado"
            description="Ajuste os filtros para consultar outros registros."
          />
        </GlassPanel>
      )}
    </div>
  );
}
