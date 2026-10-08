import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, LoaderCircle, Pencil, Plus, Power, QrCode, Save } from "lucide-react";
import { toast } from "sonner";
import { PointQrDialog } from "@/components/cartoquali/point-qr-dialog";
import {
  GlassPanel,
  InterfaceState,
  PageHeader,
  StatusBadge,
} from "@/components/cartoquali/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listEvaluationPoints, saveEvaluationPoint } from "@/lib/points.functions";
import { getMyRegistry } from "@/lib/registry.functions";
import { pickMainPoint } from "@/lib/main-point";
import { getEvaluationUrl } from "@/lib/public-url";
import type { EvaluationPoint } from "@/types/cartoquali";
import { firstValidationError, pointSchema } from "@/utils/cartoquali-validation";

type Form = Pick<
  EvaluationPoint,
  "name" | "location" | "description" | "code" | "surveyId" | "status"
>;
const emptyForm: Form = {
  name: "",
  location: "",
  description: "",
  code: "",
  surveyId: "",
  status: "Ativo",
};
function Modal({ children, onClose }: { children: ReactNode; onClose(): void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/20 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="my-4 w-full max-w-lg rounded-xl border border-glass-border bg-background p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function PointsPage() {
  const fetchPoints = useServerFn(listEvaluationPoints);
  const savePoint = useServerFn(saveEvaluationPoint);
  const queryClient = useQueryClient();
  const fetchRegistry = useServerFn(getMyRegistry);
  const query = useQuery({ queryKey: ["evaluation-points"], queryFn: () => fetchPoints() });
  const registryQuery = useQuery({
    queryKey: ["registry", "current"],
    queryFn: () => fetchRegistry(),
  });
  const [selected, setSelected] = useState<EvaluationPoint>();
  const [qrPoint, setQrPoint] = useState<EvaluationPoint>();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  useEffect(() => {
    if (!form.surveyId && query.data?.surveys[0]?.id)
      setForm((current) => ({ ...current, surveyId: query.data?.surveys[0]?.id ?? "" }));
  }, [form.surveyId, query.data]);
  const close = () => {
    setSelected(undefined);
    setOpen(false);
    setForm({ ...emptyForm, surveyId: query.data?.surveys[0]?.id ?? "" });
  };
  const mutation = useMutation({
    mutationFn: () => savePoint({ data: { ...form, ...(selected ? { id: selected.id } : {}) } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["evaluation-points"] });
      close();
      toast.success(selected ? "Ponto atualizado" : "Ponto criado");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o ponto."),
  });
  const statusMutation = useMutation({
    mutationFn: (point: EvaluationPoint) =>
      savePoint({
        data: {
          name: point.name,
          location: point.location,
          description: point.description,
          code: point.code,
          surveyId: point.surveyId,
          status: point.status === "Ativo" ? "Inativo" : "Ativo",
          id: point.id,
        },
      }),
    onSuccess: async (point) => {
      await queryClient.invalidateQueries({ queryKey: ["evaluation-points"] });
      toast.success(point.status === "Ativo" ? "Ponto ativado" : "Ponto desativado");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Não foi possível alterar o status do ponto.",
      ),
  });
  const edit = (point: EvaluationPoint) => {
    setSelected(point);
    setForm({
      name: point.name,
      location: point.location,
      description: point.description,
      code: point.code,
      surveyId: point.surveyId,
      status: point.status,
    });
    setOpen(true);
  };
  const save = () => {
    const error = firstValidationError(pointSchema.safeParse(form));
    if (error) {
      toast.error(error);
      return;
    }
    mutation.mutate();
  };
  const copyPublicLink = async (code: string) => {
    const url = getEvaluationUrl(code);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement("textarea");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        if (!document.execCommand("copy")) throw new Error();
        input.remove();
      }
      toast.success("Link de avaliação copiado");
    } catch {
      toast.error("Não foi possível copiar. Abra o link e copie o endereço do navegador.");
    }
  };

  const mainPoint = query.data ? pickMainPoint(query.data.points) : undefined;
  const registry = registryQuery.data?.registry;

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Coleta de feedback"
        title="QR Code do cartório"
        description="Um único QR Code para todo o atendimento. O cidadão informa o serviço utilizado na própria avaliação."
        action={
          query.data?.canManage && !query.data.points.length ? (
            <Button disabled={!query.data?.surveys.length} onClick={() => setOpen(true)}>
              <Plus />
              Criar QR Code
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <GlassPanel>
          <InterfaceState
            kind="loading"
            title="Carregando pontos"
            description="Buscando os pontos do seu cartório."
          />
        </GlassPanel>
      ) : query.isError ? (
        <GlassPanel>
          <InterfaceState
            kind="error"
            title="Não foi possível carregar os pontos"
            description="Verifique sua conexão e tente novamente."
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </GlassPanel>
      ) : !query.data?.surveys.length && !query.data?.points.length ? (
        <GlassPanel>
          <InterfaceState
            kind="empty"
            title="Nenhuma pesquisa disponível"
            description="Crie uma pesquisa ativa antes de cadastrar um ponto de avaliação."
          />
        </GlassPanel>
      ) : mainPoint ? (
        <div className="grid max-w-2xl gap-4">
          {[mainPoint].map((point) => (
            <GlassPanel key={point.id} className="flex flex-col" tour="qr-card">
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <QrCode />
                </div>
                <StatusBadge tone={point.status === "Ativo" ? "positive" : "neutral"}>
                  {point.status}
                </StatusBadge>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold">
                {registry?.officialName || point.name}
              </h2>
              {registry?.tradeName && registry.tradeName !== registry.officialName && (
                <p className="text-sm text-muted-foreground">{registry.tradeName}</p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Código público</dt>
                  <dd className="font-medium">{point.code}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Coleta</dt>
                  <dd className="font-medium">Link e QR Code</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Pesquisa ativa</dt>
                  <dd className="font-medium">
                    {query.data.surveyNames[point.surveyId] ?? "Pesquisa indisponível"}
                  </dd>
                </div>
              </dl>
              <code className="mt-4 block truncate rounded-md bg-muted px-3 py-2 text-xs">
                /avaliar/{point.code}
              </code>
              <div data-tour="qr-share" className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => void copyPublicLink(point.code)}>
                  <Copy />
                  Copiar link
                </Button>
                <Button asChild variant="outline">
                  <a href={getEvaluationUrl(point.code)} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Abrir
                  </a>
                </Button>
                <Button
                  className="col-span-2"
                  data-tour="qr-print"
                  onClick={() => setQrPoint(point)}
                >
                  <QrCode />
                  Ver QR Code e imprimir cartaz
                </Button>
              </div>
              {query.data.canManage && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => edit(point)}>
                    <Pencil />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(point)}
                  >
                    <Power />
                    {point.status === "Ativo" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              )}
            </GlassPanel>
          ))}
        </div>
      ) : (
        <GlassPanel>
          <InterfaceState
            kind="empty"
            title="QR Code ainda não criado"
            description={
              query.data?.canManage
                ? "Crie o QR Code do cartório para começar a receber avaliações."
                : "O administrador do cartório ainda não criou o QR Code."
            }
          />
        </GlassPanel>
      )}
      {open && (
        <Modal onClose={close}>
          <h2 className="font-display text-lg font-bold">
            {selected ? "Editar QR Code" : "Criar QR Code do cartório"}
          </h2>
          <div className="mt-5 grid gap-4">
            <label className="block text-sm font-medium">
              Nome
              <Input
                maxLength={120}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Localização
              <Input
                maxLength={160}
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Descrição
              <Textarea
                maxLength={500}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Código público
              <Input
                maxLength={40}
                value={form.code}
                onChange={(event) =>
                  setForm({
                    ...form,
                    code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                  })
                }
                className="mt-2 font-mono uppercase"
                placeholder="CQ-RECEPCAO-01"
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Use 3 a 40 letras, números ou hífens. Alterações afetam o link canônico; links
                antigos continuam válidos.
              </span>
            </label>
            <label className="block text-sm font-medium">
              Pesquisa ativa
              <select
                className="mt-2 h-9 w-full rounded-md border bg-background px-3"
                value={form.surveyId}
                onChange={(event) => setForm({ ...form, surveyId: event.target.value })}
              >
                {query.data?.surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Status
              <select
                className="mt-2 h-9 w-full rounded-md border bg-background px-3"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as EvaluationPoint["status"] })
                }
              >
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Modal>
      )}
      <PointQrDialog
        point={qrPoint}
        officialName={registry?.officialName}
        tradeName={registry?.tradeName}
        open={Boolean(qrPoint)}
        onOpenChange={(next) => {
          if (!next) setQrPoint(undefined);
        }}
      />
    </div>
  );
}
