import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getRegistrySettings, saveRegistrySettings } from "@/lib/settings.functions";
import { GlassPanel, InterfaceState, PageHeader } from "./primitives";
type SettingsDraft = {
  displayName: string;
  language: string;
  dateFormat: string;
  timezone: string;
  thankYouMessage: string;
  defaultSurveyId: string | null;
  anonymousEvaluations: boolean;
  allowComments: boolean;
  allowContact: boolean;
  activeMethodology: string;
  privacyContactChannel: string | null;
  privacyNoticeVersion: string;
  evaluationRetentionDays: number | null;
  contactRetentionDays: number | null;
  auditRetentionDays: number | null;
};
const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) => (
  <label className="text-sm font-medium">
    {label}
    <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);
const RetentionField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange(value: number | null): void;
}) => (
  <label className="text-sm font-medium">
    {label}
    <Input
      className="mt-1.5"
      type="number"
      min={1}
      max={36500}
      value={value ?? ""}
      placeholder="Pendente"
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    />
    <span className="mt-1 block text-xs font-normal text-muted-foreground">
      Vazio: prazo pendente de definição jurídica/contratual.
    </span>
  </label>
);
export function SettingsPage() {
  const getSettings = useServerFn(getRegistrySettings);
  const saveSettings = useServerFn(saveRegistrySettings);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["registry-settings"], queryFn: () => getSettings() });
  const [draft, setDraft] = useState<SettingsDraft>();
  useEffect(() => {
    if (query.data) setDraft(query.data.settings);
  }, [query.data]);
  const mutation = useMutation({
    mutationFn: () =>
      draft
        ? saveSettings({ data: draft })
        : Promise.reject(new Error("Configurações indisponíveis.")),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["registry-settings"] });
      toast.success("Configurações salvas");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });
  if (query.isLoading || !draft || !query.data)
    return (
      <GlassPanel>
        <InterfaceState
          kind="loading"
          title="Carregando configurações"
          description="Buscando as preferências do cartório."
        />
      </GlassPanel>
    );
  if (query.isError)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Configurações indisponíveis"
          description={query.error instanceof Error ? query.error.message : "Tente novamente."}
        />
      </GlassPanel>
    );
  const toggles = [
    ["anonymousEvaluations", "Permitir avaliações sem identificação cadastral"],
    ["allowComments", "Permitir comentários"],
    ["allowContact", "Permitir solicitação de contato"],
  ] as const;
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Administração"
        title="Configurações gerais"
        description="Preferências persistentes e auditáveis do seu cartório."
        action={
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            <Save />
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <GlassPanel>
          <div className="flex items-center gap-2">
            <Settings2 className="text-primary" />
            <h2 className="font-display text-lg font-bold">Plataforma e pesquisa</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <Field
              label="Nome exibido"
              value={draft.displayName}
              onChange={(displayName) => setDraft({ ...draft, displayName })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Idioma"
                value={draft.language}
                onChange={(language) => setDraft({ ...draft, language })}
              />
              <Field
                label="Formato de data"
                value={draft.dateFormat}
                onChange={(dateFormat) => setDraft({ ...draft, dateFormat })}
              />
            </div>
            <Field
              label="Fuso horário"
              value={draft.timezone}
              onChange={(timezone) => setDraft({ ...draft, timezone })}
            />
            <label className="text-sm font-medium">
              Mensagem de agradecimento
              <Textarea
                className="mt-1.5"
                value={draft.thankYouMessage}
                onChange={(e) => setDraft({ ...draft, thankYouMessage: e.target.value })}
              />
            </label>
          </div>
        </GlassPanel>
        <GlassPanel>
          <h2 className="font-display text-lg font-bold">Coleta e metodologia</h2>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-medium">
              Pesquisa padrão
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
                value={draft.defaultSurveyId ?? ""}
                onChange={(e) => setDraft({ ...draft, defaultSurveyId: e.target.value || null })}
              >
                <option value="">Nenhuma</option>
                {query.data.surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.nome}
                  </option>
                ))}
              </select>
            </label>
            {toggles.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{label}</span>
                <Switch
                  checked={draft[key]}
                  onCheckedChange={(value) => setDraft({ ...draft, [key]: value })}
                />
              </div>
            ))}
            <Field
              label="Metodologia ativa"
              value={draft.activeMethodology}
              onChange={(activeMethodology) => setDraft({ ...draft, activeMethodology })}
            />
          </div>
        </GlassPanel>
        <GlassPanel className="xl:col-span-2">
          <h2 className="font-display text-lg font-bold">Privacidade e retenção</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A definição dos prazos depende de validação jurídica e contratual. Nenhum dado é apagado
            automaticamente enquanto os campos estiverem vazios.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">
              Canal público de privacidade
              <Textarea
                className="mt-1.5"
                maxLength={500}
                value={draft.privacyContactChannel ?? ""}
                placeholder="Pendente de configuração"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    privacyContactChannel: e.target.value.trim() ? e.target.value : null,
                  })
                }
              />
            </label>
            <Field
              label="Versão do aviso"
              value={draft.privacyNoticeVersion}
              onChange={(privacyNoticeVersion) => setDraft({ ...draft, privacyNoticeVersion })}
            />
            <RetentionField
              label="Avaliações (dias)"
              value={draft.evaluationRetentionDays}
              onChange={(evaluationRetentionDays) =>
                setDraft({ ...draft, evaluationRetentionDays })
              }
            />
            <RetentionField
              label="Contatos (dias)"
              value={draft.contactRetentionDays}
              onChange={(contactRetentionDays) => setDraft({ ...draft, contactRetentionDays })}
            />
            <RetentionField
              label="Auditoria (dias)"
              value={draft.auditRetentionDays}
              onChange={(auditRetentionDays) => setDraft({ ...draft, auditRetentionDays })}
            />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
