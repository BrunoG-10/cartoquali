import { userMessage } from "@/lib/user-message";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Edit3, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/cartoquali/auth-provider";
import {
  GlassPanel,
  InterfaceState,
  PageHeader,
  StatusBadge,
} from "@/components/cartoquali/primitives";
import { RegistryAttributions } from "@/components/cartoquali/registry-attributions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/permissions";
import { formatCnpj } from "@/lib/format";
import { getMyRegistry, updateMyRegistry } from "@/lib/registry.functions";
import type { Registry } from "@/types/cartoquali";
import { firstValidationError, registrySchema } from "@/utils/cartoquali-validation";

function Field({
  label,
  value,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        className="mt-1.5"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

// Razão social e CNPJ identificam o contrato: só o suporte (implantação) altera.
const LOCKED_HINT = "Alterado somente pelo suporte CartoQuali.";

export function RegistryPage() {
  const { currentRole } = useAuth();
  const canEdit = can(currentRole, "registry", "manage");
  const fetchRegistry = useServerFn(getMyRegistry);
  const saveRegistry = useServerFn(updateMyRegistry);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["registry", "current"], queryFn: () => fetchRegistry() });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Registry | null>(null);

  useEffect(() => {
    if (query.data?.registry) setDraft(query.data.registry);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: async (registry: Registry) => saveRegistry({ data: registry }),
    onSuccess: async (registry) => {
      await queryClient.invalidateQueries({ queryKey: ["registry", "current"] });
      setDraft(registry);
      setEditing(false);
      toast.success("Dados do cartório atualizados");
    },
    onError: (error) =>
      toast.error(userMessage(error, "Não foi possível salvar os dados do cartório.")),
  });

  if (query.isLoading)
    return (
      <GlassPanel>
        <InterfaceState
          kind="loading"
          title="Carregando cartório"
          description="Buscando os dados vinculados ao seu acesso."
        />
      </GlassPanel>
    );
  if (query.isError)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Não foi possível carregar o cartório"
          description="Verifique sua conexão e tente novamente."
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </GlassPanel>
    );
  if (!query.data?.registry || !draft)
    return (
      <GlassPanel>
        <InterfaceState
          kind="empty"
          title="Cartório não encontrado"
          description="Seu usuário ainda não está vinculado a um cartório válido."
        />
      </GlassPanel>
    );

  const registry = query.data.registry;
  const save = () => {
    const error = firstValidationError(registrySchema.safeParse(draft));
    if (error) {
      toast.error(error);
      return;
    }
    mutation.mutate(draft);
  };
  const cancel = () => {
    setDraft(registry);
    setEditing(false);
  };

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Administração"
        title="Cartório"
        description="Dados cadastrais e situação do seu cartório."
        action={
          canEdit ? (
            <div className="flex gap-2">
              {editing && (
                <Button variant="outline" onClick={cancel} disabled={mutation.isPending}>
                  Cancelar
                </Button>
              )}
              <Button
                onClick={() => (editing ? save() : setEditing(true))}
                disabled={mutation.isPending}
              >
                {editing ? <Save /> : <Edit3 />}
                {mutation.isPending
                  ? "Salvando..."
                  : editing
                    ? "Salvar alterações"
                    : "Editar dados"}
              </Button>
            </div>
          ) : undefined
        }
      />
      {query.data.status === "inactive" && (
        <div className="mb-4">
          <GlassPanel>
            <InterfaceState
              kind="error"
              title="Cartório inativo"
              description="Os dados permanecem disponíveis apenas para consulta. Procure o suporte para regularizar o acesso."
            />
          </GlassPanel>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <GlassPanel tour="registry-data">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">Dados cadastrais</h2>
              <p className="text-xs text-muted-foreground">Identificação, endereço e contato</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Razão social"
              value={draft.officialName}
              disabled
              hint={LOCKED_HINT}
              onChange={() => undefined}
            />
            <Field
              label="Nome fantasia"
              value={draft.tradeName}
              disabled={!editing}
              onChange={(tradeName) => setDraft({ ...draft, tradeName })}
            />
            <Field
              label="CNPJ"
              value={formatCnpj(draft.cnpj)}
              disabled
              hint={LOCKED_HINT}
              onChange={() => undefined}
            />
            <Field
              label="Ofício (Único ou nº do ofício)"
              value={draft.serviceType}
              disabled={!editing}
              onChange={(serviceType) => setDraft({ ...draft, serviceType })}
            />
            <Field
              label="E-mail"
              value={draft.email}
              disabled={!editing}
              onChange={(email) => setDraft({ ...draft, email })}
            />
            <Field
              label="Telefone"
              value={draft.phone}
              disabled={!editing}
              onChange={(phone) => setDraft({ ...draft, phone })}
            />
            <div className="sm:col-span-2">
              <Field
                label="Endereço"
                value={draft.street}
                disabled={!editing}
                onChange={(street) => setDraft({ ...draft, street })}
              />
            </div>
            <Field
              label="Número"
              value={draft.number}
              disabled={!editing}
              onChange={(number) => setDraft({ ...draft, number })}
            />
            <Field
              label="Complemento"
              value={draft.complement}
              disabled={!editing}
              onChange={(complement) => setDraft({ ...draft, complement })}
            />
            <Field
              label="Bairro"
              value={draft.district}
              disabled={!editing}
              onChange={(district) => setDraft({ ...draft, district })}
            />
            <Field
              label="Cidade"
              value={draft.city}
              disabled={!editing}
              onChange={(city) => setDraft({ ...draft, city })}
            />
            <Field
              label="UF"
              value={draft.state}
              disabled={!editing}
              onChange={(state) => setDraft({ ...draft, state })}
            />
            <Field
              label="CEP"
              value={draft.zipCode}
              disabled={!editing}
              onChange={(zipCode) => setDraft({ ...draft, zipCode })}
            />
            <div className="sm:col-span-2">
              <Field
                label="Responsável"
                value={draft.manager}
                disabled={!editing}
                onChange={(manager) => setDraft({ ...draft, manager })}
              />
            </div>
          </div>
        </GlassPanel>
        <div className="space-y-4 xl:order-last xl:col-span-2">
          <RegistryAttributions canEdit={canEdit} />
        </div>
        <div className="space-y-4">
          <GlassPanel>
            <p className="text-xs font-semibold uppercase text-primary">Status da conta</p>
            <div className="mt-3 flex items-center justify-between">
              <strong>{registry.plan}</strong>
              <StatusBadge tone={registry.status === "Ativo" ? "positive" : "danger"}>
                {registry.status}
              </StatusBadge>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Criado em</dt>
                <dd>
                  {new Date(registry.createdAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Renovação</dt>
                <dd>
                  {registry.renewalDate
                    ? new Date(registry.renewalDate).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })
                    : "Não informada"}
                </dd>
              </div>
            </dl>
          </GlassPanel>
          <GlassPanel>
            <h2 className="font-display font-bold">Escopo isolado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Os dados exibidos pertencem ao cartório vinculado ao seu usuário. O identificador do
              cartório não pode ser alterado nesta tela.
            </p>
            {!canEdit && (
              <p className="mt-3 text-sm font-medium text-warning">
                Seu perfil possui acesso somente para consulta.
              </p>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
