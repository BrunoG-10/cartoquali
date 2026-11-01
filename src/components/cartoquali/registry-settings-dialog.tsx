import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getRegistryPublicSettings,
  saveRegistryPublicSettings,
  type RegistryPublicSettings,
} from "@/lib/platform.functions";
import type { PlatformRegistry } from "@/lib/platform-overview";
import { userMessage } from "@/lib/user-message";
import { DialogLayer } from "./dialog-layer";
import { GooglePlacePicker } from "./google-place-picker";

/**
 * Configurações de um cartório, editadas pelo administrador global no Painel da plataforma.
 * O banco confere PLATFORM_ADMIN em cada leitura e gravação.
 */
export function RegistrySettingsDialog({
  registry,
  onClose,
}: {
  registry: PlatformRegistry;
  onClose(): void;
}) {
  const load = useServerFn(getRegistryPublicSettings);
  const save = useServerFn(saveRegistryPublicSettings);
  const query = useQuery({
    queryKey: ["registry-public-settings", registry.id],
    queryFn: () => load({ data: { registryId: registry.id } }),
    staleTime: 0,
  });
  const [form, setForm] = useState<RegistryPublicSettings>();
  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);
  const mutation = useMutation({
    mutationFn: (data: RegistryPublicSettings) =>
      save({
        data: {
          registryId: registry.id,
          ...data,
          privacyContactChannel: data.privacyContactChannel?.trim() || null,
        },
      }),
    onSuccess: async () => {
      await query.refetch();
      toast.success(`Configurações de ${registry.name} salvas.`);
      onClose();
    },
    onError: (error) => toast.error(userMessage(error, "Não foi possível salvar.")),
  });

  return (
    <DialogLayer
      labelledBy="registry-settings-title"
      onClose={onClose}
      closeOnBackdrop={false}
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/25 p-4"
    >
      <div className="mx-auto my-8 max-w-2xl rounded-lg bg-background p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="registry-settings-title" className="font-display text-xl font-bold">
              Configurar cartório
            </h2>
            <p className="text-sm text-muted-foreground">{registry.name}</p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Fechar" onClick={onClose}>
            <X />
          </Button>
        </div>

        {query.isError ? (
          <div role="alert" className="mt-6 rounded-lg bg-danger-soft p-3 text-sm text-destructive">
            {userMessage(query.error, "Não foi possível carregar as configurações.")}
          </div>
        ) : !form ? (
          <div role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            Carregando configurações
          </div>
        ) : (
          <>
            <section className="mt-6">
              <h3 className="font-display text-lg font-bold">Avaliação pública</h3>
              <label className="mt-3 block text-sm font-medium">
                Mensagem de agradecimento
                <Textarea
                  className="mt-1.5"
                  maxLength={500}
                  value={form.thankYouMessage}
                  onChange={(event) => setForm({ ...form, thankYouMessage: event.target.value })}
                />
              </label>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
                <span>
                  <span className="block text-sm font-medium">Permitir pedido de retorno</span>
                  <span className="block text-xs text-muted-foreground">
                    O cidadão pode deixar telefone ou e-mail para o cartório entrar em contato.
                  </span>
                </span>
                <Switch
                  checked={form.allowContact}
                  onCheckedChange={(allowContact) => setForm({ ...form, allowContact })}
                />
              </label>
            </section>

            <section className="mt-6 border-t border-border pt-5">
              <h3 className="mb-1 font-display text-lg font-bold">Avaliações no Google</h3>
              <GooglePlacePicker
                value={{
                  placeId: form.googlePlaceId,
                  placeName: form.googlePlaceName,
                  inviteActive: form.googleInviteActive,
                }}
                busy={mutation.isPending}
                onChange={(next) =>
                  setForm({
                    ...form,
                    googlePlaceId: next.placeId,
                    googlePlaceName: next.placeName,
                    googleInviteActive: next.inviteActive,
                  })
                }
              />
            </section>

            <section className="mt-6 border-t border-border pt-5">
              <h3 className="font-display text-lg font-bold">Privacidade</h3>
              <label className="mt-3 block text-sm font-medium">
                Encarregado de dados (DPO) e canal de privacidade
                <Textarea
                  className="mt-1.5"
                  maxLength={255}
                  value={form.privacyContactChannel ?? ""}
                  placeholder="Ex.: Encarregada: Maria Souza — privacidade@cartorio.com.br"
                  onChange={(event) =>
                    setForm({ ...form, privacyContactChannel: event.target.value })
                  }
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Aparece para o cidadão na tela da avaliação.
                </span>
              </label>
              <label className="mt-3 block max-w-48 text-sm font-medium">
                Versão do aviso
                <Input
                  className="mt-1.5"
                  maxLength={30}
                  value={form.privacyNoticeVersion}
                  onChange={(event) =>
                    setForm({ ...form, privacyNoticeVersion: event.target.value })
                  }
                />
              </label>
            </section>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button
                disabled={mutation.isPending || !form.thankYouMessage.trim()}
                onClick={() => mutation.mutate(form)}
              >
                {mutation.isPending ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogLayer>
  );
}
