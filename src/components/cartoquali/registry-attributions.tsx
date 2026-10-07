import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, Save } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel, InterfaceState } from "@/components/cartoquali/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ATTRIBUTIONS, ATTRIBUTION_LABELS, type AttributionKey } from "@/lib/attributions";
import {
  getRegistryServices,
  setRegistryAttributions,
  setRegistryServiceActive,
} from "@/lib/registry-services.functions";

const queryKey = ["registry", "services"];

export function RegistryAttributions({ canEdit }: { canEdit: boolean }) {
  const fetchServices = useServerFn(getRegistryServices);
  const saveAttributions = useServerFn(setRegistryAttributions);
  const toggleService = useServerFn(setRegistryServiceActive);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: () => fetchServices() });
  const [selected, setSelected] = useState<AttributionKey[]>([]);

  useEffect(() => {
    if (query.data) setSelected(query.data.attributions);
  }, [query.data]);

  const attributionsMutation = useMutation({
    mutationFn: (attributions: AttributionKey[]) => saveAttributions({ data: { attributions } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Atribuições salvas");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });
  const serviceMutation = useMutation({
    mutationFn: (input: { serviceId: string; active: boolean }) => toggleService({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."),
  });

  if (query.isLoading)
    return (
      <GlassPanel>
        <InterfaceState kind="loading" title="Carregando atribuições" description="Aguarde." />
      </GlassPanel>
    );
  if (query.isError || !query.data)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Não foi possível carregar as atribuições"
          description="Verifique sua conexão e tente novamente."
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </GlassPanel>
    );

  const saved = query.data.attributions;
  const changed = selected.length !== saved.length || selected.some((key) => !saved.includes(key));
  const removed = saved.filter((key) => !selected.includes(key));
  const toggle = (key: AttributionKey, checked: boolean) =>
    setSelected((current) =>
      checked ? [...current, key] : current.filter((item) => item !== key),
    );
  const save = () => {
    if (!selected.length) {
      toast.error("Selecione ao menos uma atribuição.");
      return;
    }
    attributionsMutation.mutate(selected);
  };

  return (
    <GlassPanel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <ListChecks />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">Atribuições e serviços</h2>
            <p className="text-xs text-muted-foreground">
              Definem a pergunta "Qual serviço você utilizou hoje?" da avaliação.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={!changed || attributionsMutation.isPending}>
            <Save />
            {attributionsMutation.isPending ? "Salvando..." : "Salvar atribuições"}
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ATTRIBUTIONS.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <Checkbox
              checked={selected.includes(item.key)}
              disabled={!canEdit}
              onCheckedChange={(checked) => toggle(item.key, checked === true)}
              aria-label={item.label}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      {removed.length > 0 && (
        <p className="mt-3 text-sm text-warning">
          Ao desmarcar, os serviços dessa atribuição deixam de aparecer na avaliação. As avaliações
          já recebidas continuam no histórico.
        </p>
      )}

      {saved.length > 0 && (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Desative os serviços que o cartório não oferece. Eles deixam de aparecer para o cidadão.
          </p>
          {ATTRIBUTIONS.filter((item) => saved.includes(item.key)).map((item) => (
            <div key={item.key}>
              <h3 className="mb-2 text-sm font-semibold">{ATTRIBUTION_LABELS[item.key]}</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {query.data.services
                  .filter((service) => service.attribution === item.key)
                  .map((service) => (
                    <li
                      key={service.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className={service.active ? "" : "text-muted-foreground line-through"}>
                        {service.name}
                      </span>
                      <Switch
                        checked={service.active}
                        disabled={!canEdit || serviceMutation.isPending}
                        onCheckedChange={(active) =>
                          serviceMutation.mutate({ serviceId: service.id, active })
                        }
                        aria-label={`${service.active ? "Desativar" : "Ativar"} ${service.name}`}
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
