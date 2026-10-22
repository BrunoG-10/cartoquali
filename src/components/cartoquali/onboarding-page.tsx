import { userMessage } from "@/lib/user-message";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  LoaderCircle,
  Plus,
  Power,
  PowerOff,
  QrCode,
  Rocket,
  RotateCcw,
  Send,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassPanel, InterfaceState, PageHeader, StatusBadge } from "./primitives";
import {
  createOnboardingAdministrator,
  createOnboardingRegistry,
  listOnboardings,
  prepareOnboardingTest,
  publishOnboardingSurvey,
  resendOnboardingAdministrator,
  saveOnboardingPoint,
  saveOnboardingSurvey,
  setOnboardingStatus,
  type OnboardingItem,
} from "@/lib/onboarding.functions";
import {
  getEvaluationUrl,
  getOnboardingFormUrl,
  ONBOARDING_FORM_PATH,
} from "@/lib/public-url";
import { ATTRIBUTIONS, type AttributionKey } from "@/lib/attributions";
import { formatCnpj } from "@/lib/format";

const steps = [
  "Cartório",
  "Administrador",
  "Pesquisa",
  "Perguntas",
  "Ponto",
  "QR Code",
  "Teste",
  "Ativação",
];
const STEP_SUCCESS: Record<string, string> = {
  admin: "Convite enviado ao administrador do cartório.",
  survey: "Pesquisa salva.",
  publish: "Pesquisa publicada.",
  point: "Ponto salvo e QR Code gerado.",
  test: "Teste preparado. Use “Abrir teste” para responder.",
  activate: "Cartório ativado. O QR Code já recebe avaliações.",
  deactivate: "Cartório desativado.",
  reactivate: "Cartório reativado.",
};
const blankRegistry = {
  officialName: "",
  tradeName: "",
  cnpj: "",
  serviceType: "",
  city: "",
  state: "",
  manager: "",
  email: "",
  phone: "",
  attributions: [] as AttributionKey[],
};
/** Campos obrigatórios do novo cartório que ainda estão vazios, para o botão explicar o bloqueio. */
function missingRegistryFields(value: typeof blankRegistry): string[] {
  const missing: string[] = [];
  if (!value.officialName.trim()) missing.push("razão social");
  if (!value.tradeName.trim()) missing.push("nome fantasia");
  if (!value.cnpj.trim()) missing.push("CNPJ");
  if (!value.serviceType.trim()) missing.push("ofício");
  if (!value.city.trim()) missing.push("cidade");
  if (value.state.trim().length !== 2) missing.push("UF (2 letras)");
  if (!value.manager.trim()) missing.push("responsável");
  if (!value.attributions.length) missing.push("ao menos uma atribuição");
  return missing;
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        type={type}
        className="mt-1.5"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
const tone = (status: OnboardingItem["status"]) =>
  status === "ACTIVE"
    ? ("positive" as const)
    : status === "BLOCKED"
      ? ("danger" as const)
      : status === "READY_FOR_TEST"
        ? ("warning" as const)
        : ("neutral" as const);
const statusLabel = {
  IN_PROGRESS: "Em implantação",
  READY_FOR_TEST: "Pronto para teste",
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
};

/** Ficha preenchível que o suporte envia ao cartório; os dados dela alimentam o cadastro abaixo. */
function OnboardingFormActions() {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getOnboardingFormUrl());
      toast.success("Link da ficha copiado. Envie ao cartório para preencher.");
    } catch {
      toast.error("Não foi possível copiar. Use “Baixar ficha” e envie o arquivo.");
    }
  };
  return (
    <>
      <Button variant="outline" asChild>
        <a href={ONBOARDING_FORM_PATH} download="ficha-de-implantacao-cartoquali.pdf">
          <Download />
          Baixar ficha
        </a>
      </Button>
      <Button variant="outline" onClick={() => void copyLink()}>
        <Copy />
        Copiar link da ficha
      </Button>
    </>
  );
}

export function OnboardingPage() {
  const load = useServerFn(listOnboardings),
    createRegistry = useServerFn(createOnboardingRegistry);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["onboardings"], queryFn: () => load() });
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [registry, setRegistry] = useState(blankRegistry);
  const selected = query.data?.find((item) => item.id === selectedId);
  const refresh = () => client.invalidateQueries({ queryKey: ["onboardings"] });
  const createMutation = useMutation({
    mutationFn: () =>
      createRegistry({
        data: {
          ...registry,
          state: registry.state.toUpperCase(),
          clientRequestId: crypto.randomUUID(),
        },
      }),
    onSuccess: async (result) => {
      await refresh();
      setCreating(false);
      setRegistry(blankRegistry);
      // Lê a lista já atualizada (query.data deste closure ainda é a anterior, sem o cartório novo).
      const fresh = client.getQueryData<OnboardingItem[]>(["onboardings"]) ?? [];
      setSelectedId(fresh.find((x) => x.registryId === result.id)?.id);
      toast.success("Cartório criado; a implantação pode continuar.");
    },
    onError: (e) => toast.error(userMessage(e, "Não foi possível criar o cartório.")),
  });
  if (query.isLoading)
    return (
      <GlassPanel>
        <InterfaceState
          kind="loading"
          title="Carregando implantações"
          description="Buscando o progresso salvo de cada cartório."
        />
      </GlassPanel>
    );
  if (query.isError)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Implantações indisponíveis"
          description={query.error instanceof Error ? query.error.message : "Tente novamente."}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </GlassPanel>
    );
  if (selected)
    return (
      <OnboardingWizard
        item={selected}
        onBack={() => setSelectedId(undefined)}
        onRefresh={refresh}
      />
    );
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Implantações"
        description="Cadastre, teste e ative novos cartórios sem operações manuais."
        action={
          <div className="flex flex-wrap gap-2">
            <OnboardingFormActions />
            <Button onClick={() => setCreating(!creating)} data-tour="onboarding-new">
              {creating ? <ChevronLeft /> : <Plus />}
              {creating ? "Voltar" : "Novo cartório"}
            </Button>
          </div>
        }
      />
      {creating ? (
        <GlassPanel>
          <h2 className="font-display text-lg font-bold">Novo cartório</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O CNPJ não poderá ser duplicado. O cadastro começa inativo.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Razão social"
              value={registry.officialName}
              onChange={(officialName) => setRegistry({ ...registry, officialName })}
            />
            <Field
              label="Nome fantasia"
              value={registry.tradeName}
              onChange={(tradeName) => setRegistry({ ...registry, tradeName })}
            />
            <Field
              label="CNPJ"
              value={registry.cnpj}
              onChange={(cnpj) => setRegistry({ ...registry, cnpj })}
            />
            <Field
              label="Ofício (Único ou nº do ofício)"
              placeholder="Ex.: Ofício Único, 1º Ofício"
              value={registry.serviceType}
              onChange={(serviceType) => setRegistry({ ...registry, serviceType })}
            />
            <Field
              label="Cidade"
              value={registry.city}
              onChange={(city) => setRegistry({ ...registry, city })}
            />
            <Field
              label="UF"
              value={registry.state}
              onChange={(state) => setRegistry({ ...registry, state: state.slice(0, 2) })}
            />
            <Field
              label="Responsável"
              value={registry.manager}
              onChange={(manager) => setRegistry({ ...registry, manager })}
            />
            <Field
              label="E-mail institucional"
              type="email"
              value={registry.email}
              onChange={(email) => setRegistry({ ...registry, email })}
            />
            <Field
              label="Telefone"
              value={registry.phone}
              onChange={(phone) => setRegistry({ ...registry, phone })}
            />
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Atribuições da serventia</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Selecione ao menos uma. Elas montam a pergunta "Qual serviço você utilizou hoje?".
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ATTRIBUTIONS.map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <Checkbox
                    checked={registry.attributions.includes(item.key)}
                    onCheckedChange={(checked) =>
                      setRegistry({
                        ...registry,
                        attributions:
                          checked === true
                            ? [...registry.attributions, item.key]
                            : registry.attributions.filter((key) => key !== item.key),
                      })
                    }
                    aria-label={item.label}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex flex-col items-end gap-2">
            {missingRegistryFields(registry).length > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Falta preencher: {missingRegistryFields(registry).join(", ")}.
              </p>
            )}
            <Button
              disabled={createMutation.isPending || missingRegistryFields(registry).length > 0}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Rocket />}
              Criar e continuar
            </Button>
          </div>
        </GlassPanel>
      ) : (
        <div data-tour="onboarding-list" className="grid gap-4 lg:grid-cols-2">
          {query.data?.map((item) => (
            <GlassPanel key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-lg font-bold">
                      {item.registry.tradeName}
                    </h2>
                    {item.registry.environmentKind === "demo" && (
                      <StatusBadge tone="warning">DEMONSTRAÇÃO</StatusBadge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.registry.city}/{item.registry.state} · {formatCnpj(item.registry.cnpj)}
                  </p>
                </div>
                <StatusBadge tone={tone(item.status)}>{statusLabel[item.status]}</StatusBadge>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.max(6, ((item.currentStep + 1) / 8) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Etapa {Math.min(item.currentStep + 1, 8)} de 8</span>
                <span>Atualizado {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</span>
              </div>
              <Button
                className="mt-5 w-full"
                variant="outline"
                onClick={() => setSelectedId(item.id)}
              >
                {item.status === "ACTIVE" ? "Ver implantação" : "Continuar implantação"}
                <ChevronRight />
              </Button>
            </GlassPanel>
          ))}
          {!query.data?.length && (
            <GlassPanel className="lg:col-span-2">
              <InterfaceState
                kind="empty"
                title="Nenhuma implantação"
                description="Cadastre o primeiro cartório para iniciar o fluxo guiado."
              />
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  );
}

function OnboardingWizard({
  item,
  onBack,
  onRefresh,
}: {
  item: OnboardingItem;
  onBack(): void;
  onRefresh(): Promise<unknown>;
}) {
  const done = [
    item.checklist.registry,
    item.checklist.administrator,
    item.checklist.survey,
    // Perguntas só conta como concluída com a pesquisa publicada: o ponto depende disso.
    item.checklist.questions && item.survey?.status === "ativa",
    item.checklist.point,
    item.checklist.qr,
    item.checklist.test,
    item.status === "ACTIVE",
  ];
  // Abre na primeira etapa ainda pendente (ou na ativação, quando tudo está pronto).
  const [step, setStep] = useState(() => {
    const pending = done.findIndex((value) => !value);
    return pending === -1 ? 7 : pending;
  });
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Implantação guiada"
        title={item.registry.tradeName}
        description={`${item.registry.officialName} · progresso salvo automaticamente`}
        action={
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft />
            Todas as implantações
          </Button>
        }
      />
      {item.registry.environmentKind === "demo" && (
        <div className="mb-4">
          <StatusBadge tone="warning">
            AMBIENTE DE DEMONSTRAÇÃO — não usar para dados reais
          </StatusBadge>
        </div>
      )}
      <GlassPanel className="mb-5 overflow-x-auto p-3">
        <ol className="flex min-w-[760px] items-center">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center">
              <button
                className="group flex items-center gap-2 text-left"
                onClick={() => setStep(index)}
                aria-current={step === index ? "step" : undefined}
                aria-label={`Etapa ${index + 1}: ${label}${done[index] ? " (concluída)" : ""}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold ${done[index] ? "border-success bg-success text-white" : step === index ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                >
                  {done[index] ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${step === index ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </button>
              {index < 7 && <span className="mx-2 h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>
      </GlassPanel>
      <StepContent item={item} step={step} onStep={setStep} onRefresh={onRefresh} />
      <AdminQuickGuide />
    </div>
  );
}

function StepContent({
  item,
  step,
  onStep,
  onRefresh,
}: {
  item: OnboardingItem;
  step: number;
  onStep(v: number): void;
  onRefresh(): Promise<unknown>;
}) {
  const adminFn = useServerFn(createOnboardingAdministrator),
    surveyFn = useServerFn(saveOnboardingSurvey),
    publishFn = useServerFn(publishOnboardingSurvey),
    pointFn = useServerFn(saveOnboardingPoint),
    testFn = useServerFn(prepareOnboardingTest),
    statusFn = useServerFn(setOnboardingStatus);
  const [admin, setAdmin] = useState({ name: "", email: "", phone: "" });
  const [survey, setSurvey] = useState({
    name: item.survey?.name ?? "Pesquisa de satisfação",
    description: item.survey?.description ?? "Avaliação da qualidade do atendimento",
    useTemplate: true,
  });
  const [point, setPoint] = useState({
    name: item.point?.name ?? "Atendimento principal",
    location: item.point?.location ?? "Balcão de atendimento",
    description: "",
  });
  const [testUrl, setTestUrl] = useState("");
  const action = useMutation({
    mutationFn: async (kind: string) => {
      if (kind === "admin")
        return adminFn({
          data: {
            registryId: item.registryId,
            ...admin,
          },
        });
      if (kind === "survey") return surveyFn({ data: { registryId: item.registryId, ...survey } });
      if (kind === "publish") return publishFn({ data: { registryId: item.registryId } });
      if (kind === "point") return pointFn({ data: { registryId: item.registryId, ...point } });
      if (kind === "test") {
        const value = await testFn({ data: { registryId: item.registryId } });
        setTestUrl(`${window.location.origin}/avaliar/${value.code}?teste=${value.testToken}`);
        return value;
      }
      return statusFn({
        data: {
          registryId: item.registryId,
          action: kind as "activate" | "deactivate" | "reactivate",
        },
      });
    },
    onSuccess: async (_result, kind) => {
      await onRefresh();
      toast.success(STEP_SUCCESS[kind] ?? "Etapa atualizada com sucesso.");
    },
    onError: (e) => toast.error(userMessage(e, "Não foi possível concluir a operação.")),
  });
  const resendFn = useServerFn(resendOnboardingAdministrator);
  const resend = useMutation({
    mutationFn: () => resendFn({ data: { registryId: item.registryId } }),
    onSuccess: (result) =>
      toast.success(`Novo link de acesso enviado para ${result.email}. Ele vale por 24 horas.`),
    onError: (e) => toast.error(userMessage(e, "Não foi possível reenviar o convite.")),
  });
  const next = () => onStep(Math.min(7, step + 1));
  // "OK" conclui a etapa: faz o que falta nela (salvar, enviar, publicar) e segue para a próxima.
  // Sem pular etapa pendente: a seguinte depende dela (o ponto exige a pesquisa publicada).
  const published = item.survey?.status === "ativa";
  const ok: { label: string; kind?: string; blocked?: string } = (() => {
    switch (step) {
      case 1:
        if (item.administrator) return { label: "OK" };
        return !admin.name || !admin.email
          ? { label: "OK — enviar convite", kind: "admin", blocked: "Preencha nome e e-mail." }
          : { label: "OK — enviar convite", kind: "admin" };
      case 2:
        return survey.name
          ? { label: "OK — salvar pesquisa", kind: "survey" }
          : {
              label: "OK — salvar pesquisa",
              kind: "survey",
              blocked: "Informe o nome da pesquisa.",
            };
      case 3:
        if (!item.survey) return { label: "OK", blocked: "Salve a pesquisa na etapa anterior." };
        if (published) return { label: "OK" };
        return item.survey.questionCount < 1
          ? { label: "OK — publicar pesquisa", blocked: "A pesquisa precisa de perguntas ativas." }
          : { label: "OK — publicar pesquisa", kind: "publish" };
      case 4:
        if (!published)
          return { label: "OK — salvar ponto", blocked: "Publique a pesquisa na etapa 4." };
        return point.name && point.location
          ? { label: "OK — salvar ponto", kind: "point" }
          : { label: "OK — salvar ponto", blocked: "Preencha nome e localização." };
      case 5:
        return item.point ? { label: "OK" } : { label: "OK", blocked: "Salve o ponto na etapa 5." };
      case 6:
        return item.checklist.test
          ? { label: "OK" }
          : { label: "OK", blocked: "Prepare e responda a avaliação de teste." };
      default:
        return { label: "OK" };
    }
  })();
  const confirm = () => {
    if (ok.blocked) return;
    if (ok.kind) action.mutate(ok.kind, { onSuccess: next });
    else next();
  };
  const nav = (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" disabled={step === 0} onClick={() => onStep(step - 1)}>
        <ChevronLeft />
        Anterior
      </Button>
      {step < 7 && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {ok.blocked && <span className="text-sm text-muted-foreground">{ok.blocked}</span>}
          <Button onClick={confirm} disabled={action.isPending || Boolean(ok.blocked)}>
            {action.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
            {action.isPending ? "Salvando…" : ok.label}
            {!action.isPending && <ChevronRight />}
          </Button>
        </div>
      )}
    </div>
  );
  const publicUrl = useMemo(
    () => (item.point ? getEvaluationUrl(item.point.code) : ""),
    [item.point],
  );
  if (step === 0)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">Dados do cartório</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Razão social</dt>
            <dd className="font-medium">{item.registry.officialName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">CNPJ</dt>
            <dd className="font-medium">{formatCnpj(item.registry.cnpj)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Localidade</dt>
            <dd>
              {item.registry.city}/{item.registry.state}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Situação operacional</dt>
            <dd>
              <StatusBadge
                tone={item.registry.operationalStatus === "ativo" ? "positive" : "neutral"}
              >
                {item.registry.operationalStatus}
              </StatusBadge>
            </dd>
          </div>
        </dl>
        {nav}
      </GlassPanel>
    );
  if (step === 1)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">Administrador inicial</h2>
        {item.administrator ? (
          <>
            <InterfaceState
              kind="success"
              title={item.administrator.name}
              description={`${item.administrator.email} · convite vinculado ao cartório`}
            />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              O link do convite vale 24 horas.
              <Button
                size="sm"
                variant="outline"
                disabled={resend.isPending}
                onClick={() => resend.mutate()}
              >
                <Send />
                Reenviar convite
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              O convite cria somente o papel de administrador deste cartório.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Nome"
                value={admin.name}
                onChange={(name) => setAdmin({ ...admin, name })}
              />
              <Field
                label="E-mail"
                type="email"
                value={admin.email}
                onChange={(email) => setAdmin({ ...admin, email })}
              />
              <Field
                label="Telefone"
                value={admin.phone}
                onChange={(phone) => setAdmin({ ...admin, phone })}
              />
            </div>
          </>
        )}
        {nav}
      </GlassPanel>
    );
  if (step === 2)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">Pesquisa inicial</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use o modelo validado ou inicie uma pesquisa vazia para editar depois.
        </p>
        <div className="mt-5 grid gap-4">
          <Field
            label="Nome"
            value={survey.name}
            onChange={(name) => setSurvey({ ...survey, name })}
          />
          <label className="text-sm font-medium">
            Descrição
            <Textarea
              className="mt-1.5"
              value={survey.description}
              onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={survey.useTemplate}
              onChange={(e) => setSurvey({ ...survey, useTemplate: e.target.checked })}
            />
            Criar com perguntas modelo editáveis
          </label>
        </div>
        {nav}
      </GlassPanel>
    );
  if (step === 3)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">Perguntas e publicação</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {item.survey
            ? `${item.survey.questionCount} pergunta(s) ativa(s) em ${item.survey.name}.`
            : "Salve uma pesquisa na etapa anterior."}
        </p>
        {item.survey && (
          <p className="mt-2 text-sm text-muted-foreground">
            O administrador do cartório pode ajustar o texto das perguntas em Pesquisas depois do
            primeiro acesso.
          </p>
        )}
        {item.survey && (
          <p className="mt-3">
            <StatusBadge tone={published ? "positive" : "warning"}>
              {published ? "Pesquisa publicada" : "Pesquisa ainda não publicada"}
            </StatusBadge>
          </p>
        )}
        {nav}
      </GlassPanel>
    );
  if (step === 4)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">Ponto de avaliação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O ponto é o local onde o cartaz do QR Code fica. <b>Nome</b>: como ele aparece nos
          relatórios (ex.: Atendimento principal). <b>Localização</b>: onde o cartaz é fixado (ex.:
          Balcão de atendimento). A descrição é opcional. Ao confirmar, o QR Code é gerado.
        </p>
        <div className="mt-5 grid gap-4">
          <Field
            label="Nome do ponto"
            value={point.name}
            onChange={(name) => setPoint({ ...point, name })}
          />
          <Field
            label="Localização"
            value={point.location}
            onChange={(location) => setPoint({ ...point, location })}
          />
          <label className="text-sm font-medium">
            Descrição
            <Textarea
              className="mt-1.5"
              value={point.description}
              onChange={(e) => setPoint({ ...point, description: e.target.value })}
            />
          </label>
        </div>
        {nav}
      </GlassPanel>
    );
  if (step === 5)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">QR Code</h2>
        {item.point ? (
          <QrPanel url={publicUrl} />
        ) : (
          <InterfaceState
            kind="empty"
            title="Ponto pendente"
            description="Crie o ponto na etapa anterior para gerar seu endereço."
          />
        )}
        {nav}
      </GlassPanel>
    );
  if (step === 6)
    return (
      <GlassPanel>
        <h2 className="font-display text-xl font-bold">Avaliação de teste</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O teste usa um acesso temporário e não entra em indicadores, relatórios ou listas
          operacionais.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            disabled={action.isPending || !item.checklist.qr}
            onClick={() => action.mutate("test")}
          >
            Preparar teste
          </Button>
          {testUrl && (
            <Button variant="outline" asChild>
              <a href={testUrl} target="_blank" rel="noreferrer">
                Abrir teste
                <ExternalLink />
              </a>
            </Button>
          )}
        </div>
        {item.checklist.test && (
          <div className="mt-5">
            <InterfaceState
              kind="success"
              title="Teste concluído"
              description="A avaliação foi registrada e isolada dos dados de produção."
            />
          </div>
        )}
        {nav}
      </GlassPanel>
    );
  const labels: Record<string, string> = {
    registry: "Cartório",
    administrator: "Administrador",
    survey: "Pesquisa",
    questions: "Perguntas",
    point: "Ponto",
    qr: "QR Code",
    test: "Teste",
  };
  return (
    <GlassPanel>
      <h2 className="font-display text-xl font-bold">Ativação</h2>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {Object.entries(item.checklist)
          .filter(([key]) => key !== "complete")
          .map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <span
                className={`grid size-5 place-items-center rounded-full ${value ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}
              >
                {value && <Check className="size-3" />}
              </span>
              {labels[key]}
            </div>
          ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {item.status !== "ACTIVE" && (
          <Button
            disabled={action.isPending || !item.checklist.complete}
            onClick={() => action.mutate(item.activatedAt ? "reactivate" : "activate")}
          >
            <Power />
            Ativar cartório
          </Button>
        )}
        {item.status === "ACTIVE" && (
          <Button
            variant="destructive"
            disabled={action.isPending}
            onClick={() => action.mutate("deactivate")}
          >
            <PowerOff />
            Desativar
          </Button>
        )}
        {item.status === "BLOCKED" && item.activatedAt && (
          <Button
            variant="outline"
            disabled={action.isPending}
            onClick={() => action.mutate("reactivate")}
          >
            <RotateCcw />
            Reativar
          </Button>
        )}
      </div>
      {!item.checklist.complete && (
        <p className="mt-4 text-sm font-medium text-warning">
          A ativação permanece bloqueada até o checklist obrigatório ficar completo.
        </p>
      )}
    </GlassPanel>
  );
}

function QrPanel({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  useMemo(() => {
    void QRCode.toDataURL(url, { width: 320, margin: 2 }).then(setSrc);
  }, [url]);
  return (
    <div className="mt-5 grid items-center gap-5 sm:grid-cols-[180px_1fr]">
      {src && (
        <img
          className="mx-auto size-44 rounded-lg border bg-white p-2"
          src={src}
          alt="QR Code do ponto de avaliação"
        />
      )}
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Endereço público definitivo</p>
        <code className="mt-2 block overflow-x-auto rounded-lg bg-muted p-3 text-xs">{url}</code>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              void navigator.clipboard
                .writeText(url)
                .then(() => toast.success("Link copiado"))
                .catch(() =>
                  toast.error(
                    "Não foi possível copiar. Use “Abrir” e copie o endereço do navegador.",
                  ),
                )
            }
          >
            <Copy />
            Copiar
          </Button>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              Abrir
              <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminQuickGuide() {
  return (
    <GlassPanel className="mt-5">
      <h2 className="font-display text-lg font-bold">Guia rápido do administrador</h2>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <strong>Como começar</strong>
          <p className="mt-1 text-muted-foreground">Configure e publique sua pesquisa.</p>
        </div>
        <div>
          <strong>Como instalar o ponto</strong>
          <p className="mt-1 text-muted-foreground">
            Imprima o QR Code e coloque no local definido.
          </p>
        </div>
        <div>
          <strong>Como acompanhar</strong>
          <p className="mt-1 text-muted-foreground">Use o Dashboard e os Relatórios.</p>
        </div>
        <div>
          <strong>Como melhorar</strong>
          <p className="mt-1 text-muted-foreground">
            Trate avaliações negativas em Ocorrências e registre Planos de Melhoria.
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
