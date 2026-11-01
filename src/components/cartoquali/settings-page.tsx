import { userMessage } from "@/lib/user-message";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Save, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getRegistrySettings,
  saveGoogleReviewSettings,
  saveRegistrySettings,
} from "@/lib/settings.functions";
import { searchGooglePlaces, type GooglePlaceResult } from "@/lib/google-places.functions";
import { GOOGLE_PLACE_ID, googleReviewUrl } from "@/lib/google-review";
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
  googlePlaceId: string | null;
  googlePlaceName: string | null;
  googleInviteActive: boolean;
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
        <GoogleReviewSettings draft={draft} onChange={setDraft} />
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

/** Perfil do Google do cartório e o convite na tela de agradecimento (salvo com "Salvar"). */
function GoogleReviewSettings({
  draft,
  onChange,
}: {
  draft: SettingsDraft;
  onChange(draft: SettingsDraft): void;
}) {
  const search = useServerFn(searchGooglePlaces);
  const [term, setTerm] = useState("");
  const [manualId, setManualId] = useState("");
  const lookup = useMutation({
    mutationFn: () => search({ data: { term } }),
    onError: (error) => toast.error(userMessage(error, "Não foi possível buscar no Google.")),
  });
  // Saved right away: choosing a profile or flipping the switch must not wait for "Salvar".
  const saveGoogle = useServerFn(saveGoogleReviewSettings);
  const persist = useMutation({
    mutationFn: (next: {
      placeId: string | null;
      placeName: string | null;
      inviteActive: boolean;
    }) => saveGoogle({ data: next }).then(() => next),
    onSuccess: (next) => {
      onChange({
        ...draft,
        googlePlaceId: next.placeId,
        googlePlaceName: next.placeName,
        googleInviteActive: next.inviteActive,
      });
      toast.success(
        !next.placeId
          ? "Perfil do Google removido"
          : next.inviteActive
            ? "Convite do Google ligado"
            : "Perfil do Google salvo",
      );
    },
    onError: (error) =>
      toast.error(userMessage(error, "Não foi possível salvar o perfil do Google.")),
  });
  const choose = (place: GooglePlaceResult | { placeId: string; name: null }) =>
    persist.mutate({
      placeId: place.placeId,
      placeName:
        place.name === null
          ? null
          : [place.name, "address" in place ? place.address : ""].filter(Boolean).join(" — "),
      inviteActive: draft.googleInviteActive,
    });
  const manualValid = GOOGLE_PLACE_ID.test(manualId.trim());
  return (
    <GlassPanel className="xl:col-span-2">
      <h2 className="font-display text-lg font-bold">Avaliações no Google</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        O convite aparece para todas as avaliações, com qualquer nota, conforme as regras do Google.
      </p>
      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (term.trim().length >= 3) lookup.mutate();
        }}
      >
        <label className="flex-1 text-sm font-medium">
          Nome do cartório e cidade
          <Input
            className="mt-1.5"
            value={term}
            maxLength={120}
            placeholder="Ex.: 2º Tabelionato de Notas Curitiba"
            onChange={(event) => setTerm(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          disabled={lookup.isPending || term.trim().length < 3}
        >
          <Search />
          {lookup.isPending ? "Buscando..." : "Buscar no Google"}
        </Button>
      </form>
      {lookup.data && (
        <div className="mt-3 grid gap-2" aria-live="polite">
          {lookup.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum resultado. Tente incluir o bairro ou a cidade.
            </p>
          ) : (
            lookup.data.map((place) => (
              <button
                key={place.placeId}
                type="button"
                aria-pressed={draft.googlePlaceId === place.placeId}
                disabled={persist.isPending}
                onClick={() => choose(place)}
                className="min-h-11 rounded-lg border p-3 text-left text-sm hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span className="block font-medium">{place.name}</span>
                <span className="block text-xs text-muted-foreground">{place.address}</span>
              </button>
            ))
          )}
        </div>
      )}
      <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
        {draft.googlePlaceId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="block text-xs text-muted-foreground">Perfil escolhido</span>
              <span className="font-medium">{draft.googlePlaceName ?? draft.googlePlaceId}</span>
            </span>
            <span className="flex gap-2">
              <Button asChild variant="link" size="sm">
                <a
                  href={googleReviewUrl(draft.googlePlaceId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Conferir no Google
                  <ExternalLink aria-hidden="true" />
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={persist.isPending}
                onClick={() =>
                  persist.mutate({ placeId: null, placeName: null, inviteActive: false })
                }
              >
                Remover
              </Button>
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Nenhum perfil do Google escolhido.</span>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">Avançado: colar o código do perfil</summary>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium">
            Place ID do Google
            <Input
              className="mt-1.5 font-mono"
              value={manualId}
              maxLength={300}
              placeholder="ChIJ..."
              onChange={(event) => setManualId(event.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={!manualValid}
            onClick={() => choose({ placeId: manualId.trim(), name: null })}
          >
            Usar este código
          </Button>
        </div>
      </details>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">
            Convidar avaliantes a publicar também no Google
          </span>
          <span className="block text-xs text-muted-foreground">
            {draft.googlePlaceId
              ? "Depois de enviar a avaliação, o cidadão pode abrir a página do Google em um toque."
              : "Escolha o perfil do Google acima para ligar o convite."}
          </span>
        </span>
        <Switch
          checked={draft.googleInviteActive}
          disabled={!draft.googlePlaceId || persist.isPending}
          onCheckedChange={(inviteActive) =>
            persist.mutate({
              placeId: draft.googlePlaceId,
              placeName: draft.googlePlaceName,
              inviteActive,
            })
          }
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        Salvo automaticamente ao escolher o perfil ou ligar o convite.
      </p>
    </GlassPanel>
  );
}
