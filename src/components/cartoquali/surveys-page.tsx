import { userMessage } from "@/lib/user-message";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, ListPlus, LoaderCircle, Lock, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPE_LABELS, QUALITY_METHODOLOGY } from "@/constants/cartoquali";
import { ESSENTIAL_LABELS } from "@/lib/attributions";
import { getRegistryServices } from "@/lib/registry-services.functions";
import { resolveServiceStep } from "@/lib/service-step";
import { ServicePicker } from "./service-picker";
import {
  deactivateSurveyQuestion,
  listSurveys,
  saveSurvey,
  saveSurveyQuestion,
} from "@/lib/surveys.functions";
import type { QuestionType, Survey, SurveyQuestion } from "@/types/cartoquali";
import { GlassPanel, InterfaceState, PageHeader, StatusBadge } from "./primitives";
import { SurveyQuestionnaire } from "./survey-questionnaire";

function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/25 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className={`my-4 w-full ${wide ? "max-w-4xl" : "max-w-xl"} rounded-xl border bg-background p-6 shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
const tone = (status: Survey["status"]) =>
  status === "Ativa"
    ? ("positive" as const)
    : status === "Rascunho"
      ? ("warning" as const)
      : ("neutral" as const);

export function SurveysPage() {
  const load = useServerFn(listSurveys);
  const persistSurvey = useServerFn(saveSurvey);
  const persistQuestion = useServerFn(saveSurveyQuestion);
  const deactivate = useServerFn(deactivateSurveyQuestion);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["surveys-real"], queryFn: () => load() });
  const [selectedId, setSelectedId] = useState<string>();
  const [surveyEditor, setSurveyEditor] = useState<Survey | "new">();
  const [questionEditor, setQuestionEditor] = useState<SurveyQuestion | "new">();
  const [preview, setPreview] = useState(false);
  const [previewServiceDone, setPreviewServiceDone] = useState(false);
  const loadServices = useServerFn(getRegistryServices);
  const servicesQuery = useQuery({
    queryKey: ["registry", "services"],
    queryFn: () => loadServices(),
    enabled: preview,
  });
  const previewServiceStep = resolveServiceStep(
    (servicesQuery.data?.services ?? []).filter((service) => service.active),
  );
  const [surveyForm, setSurveyForm] = useState({ name: "", description: "", version: "1.0" });
  const [questionForm, setQuestionForm] = useState({
    text: "",
    type: "scale" as QuestionType,
    dimensionId: "general",
    required: true,
    active: true,
    options: "",
  });
  const selected = query.data?.surveys.find((item) => item.id === selectedId);
  const questions = useMemo(
    () =>
      query.data?.questions
        .filter((item) => item.surveyId === selectedId)
        .sort((a, b) => a.order - b.order) ?? [],
    [query.data, selectedId],
  );
  const refresh = () => client.invalidateQueries({ queryKey: ["surveys-real"] });
  const surveyMutation = useMutation({
    mutationFn: () => {
      const current = surveyEditor === "new" ? undefined : surveyEditor;
      return persistSurvey({
        data: {
          ...(current ? { id: current.id } : {}),
          name: surveyForm.name,
          description: surveyForm.description,
          version: surveyForm.version,
          status: current?.status ?? "Rascunho",
          settings: current?.settings,
        },
      });
    },
    onSuccess: async (result) => {
      await refresh();
      setSurveyEditor(undefined);
      setSelectedId(result.id);
      toast.success("Pesquisa salva");
    },
    onError: (error) => toast.error(userMessage(error, "Não foi possível salvar.")),
  });
  const questionMutation = useMutation({
    mutationFn: () =>
      persistQuestion({
        data: {
          ...(questionEditor !== "new" && questionEditor ? { id: questionEditor.id } : {}),
          surveyId: selected?.id ?? "",
          text: questionForm.text,
          type: questionForm.type,
          dimensionId: questionForm.dimensionId as SurveyQuestion["dimensionId"],
          order:
            questionEditor !== "new" && questionEditor
              ? questionEditor.order
              : questions.length + 1,
          required: questionForm.required,
          active: questionForm.active,
          ...(questionForm.options.trim()
            ? {
                options: questionForm.options
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
        },
      }),
    onSuccess: async () => {
      await refresh();
      setQuestionEditor(undefined);
      toast.success("Pergunta salva");
    },
    onError: (error) => toast.error(userMessage(error, "Não foi possível salvar.")),
  });
  const openSurvey = (survey?: Survey) => {
    setSurveyForm(
      survey
        ? { name: survey.name, description: survey.description, version: survey.version }
        : { name: "", description: "", version: "1.0" },
    );
    setSurveyEditor(survey ?? "new");
  };
  const openQuestion = (question?: SurveyQuestion) => {
    setQuestionForm(
      question
        ? {
            text: question.text,
            type: question.type,
            dimensionId: question.dimensionId,
            required: question.required,
            active: question.active,
            options: question.options?.join("\n") ?? "",
          }
        : {
            text: "",
            type: "scale",
            dimensionId: "general",
            required: true,
            active: true,
            options: "",
          },
    );
    setQuestionEditor(question ?? "new");
  };
  if (query.isLoading)
    return (
      <GlassPanel>
        <InterfaceState
          kind="loading"
          title="Carregando pesquisas"
          description="Buscando pesquisas e perguntas reais."
        />
      </GlassPanel>
    );
  if (query.isError)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Pesquisas indisponíveis"
          description={query.error instanceof Error ? query.error.message : "Tente novamente."}
        />
      </GlassPanel>
    );
  if (!selected)
    return (
      <div className="animate-enter">
        <PageHeader
          eyebrow="Administração"
          title="Pesquisas"
          description="Configure versões, perguntas e a experiência pública."
          action={
            query.data?.canManage ? (
              <Button onClick={() => openSurvey()}>
                <Plus />
                Nova pesquisa
              </Button>
            ) : undefined
          }
        />
        <div data-tour="surveys-list" className="grid gap-4 md:grid-cols-2">
          {query.data?.surveys.map((survey) => (
            <GlassPanel key={survey.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{survey.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>
                </div>
                <StatusBadge tone={tone(survey.status)}>{survey.status}</StatusBadge>
              </div>
              <p className="mt-5 text-sm">
                Versão {survey.version} ·{" "}
                {query.data.questions.filter((item) => item.surveyId === survey.id).length}{" "}
                perguntas
              </p>
              <div className="mt-5 flex gap-2">
                <Button
                  className="flex-1"
                  data-tour="surveys-configure"
                  onClick={() => setSelectedId(survey.id)}
                >
                  <Pencil />
                  Configurar
                </Button>
                {query.data.canManage && (
                  <Button variant="outline" onClick={() => openSurvey(survey)}>
                    Editar
                  </Button>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
        {surveyEditor && (
          <SurveyModal
            form={surveyForm}
            setForm={setSurveyForm}
            saving={surveyMutation.isPending}
            onSave={() => surveyMutation.mutate()}
            onClose={() => setSurveyEditor(undefined)}
          />
        )}
      </div>
    );
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Pesquisa"
        title={selected.name}
        description={selected.description}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelectedId(undefined)}>
              Voltar
            </Button>
            <Button variant="outline" data-tour="surveys-preview" onClick={() => setPreview(true)}>
              <Eye />
              Prévia
            </Button>
            {query.data?.canManage && (
              <Button data-tour="surveys-add-question" onClick={() => openQuestion()}>
                <ListPlus />
                Pergunta
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-5 flex items-center gap-3">
        <StatusBadge tone={tone(selected.status)}>{selected.status}</StatusBadge>
        <span className="text-sm text-muted-foreground">
          Versão {selected.version} · {questions.length} perguntas
        </span>
      </div>
      <div className="space-y-3">
        {questions.map((question, index) => (
          <GlassPanel key={question.id} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <span className="text-xs font-semibold uppercase text-primary">
                  Pergunta {index + 1}
                </span>
                <span
                  className="flex flex-wrap justify-end gap-1.5"
                  data-tour={question.essentialKey === "overall" ? "surveys-essential" : undefined}
                >
                  {question.essentialKey && (
                    <StatusBadge tone="neutral">
                      <Lock className="size-3" aria-hidden />
                      Essencial · {ESSENTIAL_LABELS[question.essentialKey]}
                    </StatusBadge>
                  )}
                  <StatusBadge tone={question.active ? "positive" : "neutral"}>
                    {question.active ? "Ativa" : "Inativa"}
                  </StatusBadge>
                </span>
              </div>
              <h2 className="mt-2 font-medium">{question.text}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {QUESTION_TYPE_LABELS[question.type]} ·{" "}
                {question.required ? "Obrigatória" : "Opcional"} ·{" "}
                {
                  QUALITY_METHODOLOGY.dimensions.find((item) => item.key === question.dimensionId)
                    ?.label
                }
              </p>
            </div>
            {query.data?.canManage && (
              <div className="flex">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Editar pergunta"
                  onClick={() => openQuestion(question)}
                >
                  <Pencil />
                </Button>
                {!question.essentialKey && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Desativar pergunta"
                    disabled={!question.active}
                    onClick={() =>
                      void deactivate({ data: { id: question.id } })
                        .then(refresh)
                        .catch((error) =>
                          toast.error(userMessage(error, "Não foi possível desativar.")),
                        )
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            )}
          </GlassPanel>
        ))}
      </div>
      {questionEditor && (
        <QuestionModal
          essential={questionEditor !== "new" && Boolean(questionEditor.essentialKey)}
          form={questionForm}
          setForm={setQuestionForm}
          saving={questionMutation.isPending}
          onSave={() => questionMutation.mutate()}
          onClose={() => setQuestionEditor(undefined)}
        />
      )}{" "}
      {preview && (
        <Modal
          wide
          onClose={() => {
            setPreview(false);
            setPreviewServiceDone(false);
          }}
        >
          <div className="rounded-lg bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
            Modo de visualização · respostas não serão registradas
          </div>
          <div className="mt-8">
            {previewServiceStep.show && !previewServiceDone ? (
              <ServicePicker
                groups={previewServiceStep.groups}
                onChoose={() => setPreviewServiceDone(true)}
              />
            ) : (
              <SurveyQuestionnaire questions={questions} preview />
            )}
          </div>
          <div className="mt-7 flex justify-end">
            <Button
              onClick={() => {
                setPreview(false);
                setPreviewServiceDone(false);
              }}
            >
              Fechar prévia
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SurveyModal({
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  form: { name: string; description: string; version: string };
  setForm(value: { name: string; description: string; version: string }): void;
  saving: boolean;
  onSave(): void;
  onClose(): void;
}) {
  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-bold">Dados da pesquisa</h2>
      <div className="mt-5 grid gap-4">
        <label className="text-sm font-medium">
          Nome
          <Input
            className="mt-1.5"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="text-sm font-medium">
          Descrição
          <Textarea
            className="mt-1.5"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="text-sm font-medium">
          Versão
          <Input
            className="mt-1.5"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
          />
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving || !form.name.trim()} onClick={onSave}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}Salvar
        </Button>
      </div>
    </Modal>
  );
}
function QuestionModal({
  essential,
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  essential: boolean;
  form: {
    text: string;
    type: QuestionType;
    dimensionId: string;
    required: boolean;
    active: boolean;
    options: string;
  };
  setForm(value: typeof form): void;
  saving: boolean;
  onSave(): void;
  onClose(): void;
}) {
  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-bold">Pergunta</h2>
      {essential && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Pergunta essencial: alimenta os indicadores do painel. Você pode ajustar o texto; tipo,
          dimensão e situação são fixos.
        </p>
      )}
      <div className="mt-5 grid gap-4">
        <label className="text-sm font-medium">
          Texto
          <Textarea
            className="mt-1.5"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Tipo
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 disabled:opacity-60"
              disabled={essential}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Dimensão
            <select
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 disabled:opacity-60"
              disabled={essential}
              value={form.dimensionId}
              onChange={(e) => setForm({ ...form, dimensionId: e.target.value })}
            >
              {QUALITY_METHODOLOGY.dimensions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!essential && ["single_choice", "multiple_choice"].includes(form.type) && (
          <label className="text-sm font-medium">
            Opções, uma por linha
            <Textarea
              className="mt-1.5"
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
            />
          </label>
        )}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.required}
              disabled={essential}
              onCheckedChange={(required) => setForm({ ...form, required })}
            />
            Obrigatória
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.active}
              disabled={essential}
              onCheckedChange={(active) => setForm({ ...form, active })}
            />
            Ativa
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving || !form.text.trim()} onClick={onSave}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}Salvar
        </Button>
      </div>
    </Modal>
  );
}
