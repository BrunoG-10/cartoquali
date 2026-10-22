import { userMessage } from "@/lib/user-message";
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
    onError: (error) => toast.error(userMessage(error, "Não foi possível salvar.")),
  });
  // Error first: without data the draft never fills, so checking loading first would spin forever.
  if (query.isError)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Não foi possível carregar as configurações"
          description="Verifique sua conexão e tente novamente."
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </GlassPanel>
    );
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
  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Administração"
        title="Configurações gerais"
        description="Preferências persistentes e auditáveis do seu cartório."
        action={
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            data-tour="settings-save"
          >
            <Save />
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        }
      />
      <div data-tour="settings-form" className="grid gap-4 xl:grid-cols-2">
        {/* Only preferences the public evaluation really reads are editable here; the other
            stored columns are kept as they are and sent back unchanged on save. */}
        <GlassPanel>
          <div className="flex items-center gap-2">
            <Settings2 className="text-primary" />
            <h2 className="font-display text-lg font-bold">Avaliação pública</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-medium">
              Mensagem de agradecimento
              <Textarea
                className="mt-1.5"
                maxLength={500}
                value={draft.thankYouMessage}
                onChange={(e) => setDraft({ ...draft, thankYouMessage: e.target.value })}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Aparece para o cidadão logo depois de enviar a avaliação.
              </span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Permitir pedido de retorno</span>
                <span className="block text-xs text-muted-foreground">
                  O cidadão pode deixar telefone ou e-mail para o cartório entrar em contato.
                </span>
              </span>
              <Switch
                checked={draft.allowContact}
                onCheckedChange={(allowContact) => setDraft({ ...draft, allowContact })}
              />
            </label>
          </div>
        </GlassPanel>
        <GlassPanel>
          <h2 className="font-display text-lg font-bold">Definido pelo CartoQuali</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Horário:</strong> todos os indicadores e
              relatórios usam o horário de Brasília.
            </li>
            <li>
              <strong className="text-foreground">Pesquisa usada no QR Code:</strong> escolhida na
              tela QR Code, ao editar o QR Code do cartório.
            </li>
            <li>
              <strong className="text-foreground">Identificação:</strong> a avaliação é sempre feita
              sem conta; o contato só existe se o cidadão pedir retorno.
            </li>
            <li>
              <strong className="text-foreground">Metodologia:</strong> a mesma para todos os
              cartórios; veja o cálculo de cada indicador em Qualidade › Metodologia.
            </li>
          </ul>
        </GlassPanel>
        <GlassPanel className="xl:col-span-2">
          <h2 className="font-display text-lg font-bold">Privacidade e retenção</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A definição dos prazos depende de validação jurídica e contratual. Nenhum dado é apagado
            automaticamente enquanto os campos estiverem vazios.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">
              Encarregado de dados (DPO) e canal de privacidade
              <Textarea
                className="mt-1.5"
                maxLength={500}
                value={draft.privacyContactChannel ?? ""}
                placeholder="Ex.: Encarregada: Maria Souza — privacidade@cartorio.com.br — (11) 0000-0000"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    privacyContactChannel: e.target.value.trim() ? e.target.value : null,
                  })
                }
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Aparece para o cidadão na tela da avaliação. A LGPD (art. 41) e o Provimento CNJ
                134/2022 pedem que o nome e o contato do encarregado do cartório sejam públicos.
              </span>
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
