import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, LoaderCircle, Plus, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/cartoquali/auth-provider";
import {
  GlassPanel,
  InterfaceState,
  PageHeader,
  StatusBadge,
} from "@/components/cartoquali/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER_ROLE_LABELS } from "@/constants/cartoquali";
import { createRegistryUser, listRegistryUsers, updateRegistryUser } from "@/lib/users.functions";
import { APP_MODULES, MODULE_LABELS, can } from "@/lib/permissions";
import type { RegistryUser, UserRole } from "@/types/cartoquali";
import { firstValidationError, userSchema } from "@/utils/cartoquali-validation";

type RealUser = RegistryUser & { hasAuthAccess: boolean };
const emptyUser: Pick<RegistryUser, "name" | "email" | "phone" | "role" | "status"> = {
  name: "",
  email: "",
  phone: "",
  role: "operator",
  status: "Ativo",
};
function Field({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
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
    </label>
  );
}
function Modal({ children, onClose }: { children: ReactNode; onClose(): void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/25 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="my-4 w-full max-w-2xl rounded-xl border border-glass-border bg-background p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function UsersPage() {
  const { currentRole, usuario } = useAuth();
  const canManage = can(currentRole, "users", "manage");
  const listUsers = useServerFn(listRegistryUsers);
  const createUser = useServerFn(createRegistryUser);
  const updateUser = useServerFn(updateRegistryUser);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["registry-users"], queryFn: () => listUsers() });
  const [selected, setSelected] = useState<RealUser>();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const close = () => {
    setSelected(undefined);
    setCreating(false);
    setForm(emptyUser);
  };
  const mutation = useMutation({
    mutationFn: async () =>
      selected
        ? updateUser({
            data: {
              id: selected.id,
              name: form.name,
              phone: form.phone,
              role: form.role === "platform_admin" ? "operator" : form.role,
              status: form.status,
            },
          })
        : createUser({
            data: {
              ...form,
              role: form.role === "platform_admin" ? "operator" : form.role,
              redirectTo: `${window.location.origin}/reset-password`,
            },
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registry-users"] });
      close();
      toast.success(selected ? "Usuário atualizado" : "Usuário criado e convite enviado");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário."),
  });
  const open = (user?: RealUser) => {
    if (user) {
      setSelected(user);
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      });
    } else setCreating(true);
  };
  const save = () => {
    const error = firstValidationError(userSchema.safeParse(form));
    if (error) {
      toast.error(error);
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Administração"
        title="Usuários e permissões"
        description="Gerencie a equipe, os perfis e o acesso ao CartoQuali."
        action={
          canManage ? (
            <Button onClick={() => open()}>
              <Plus />
              Novo usuário
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <GlassPanel>
          <InterfaceState
            kind="loading"
            title="Carregando usuários"
            description="Buscando os acessos do seu cartório."
          />
        </GlassPanel>
      ) : query.isError ? (
        <GlassPanel>
          <InterfaceState
            kind="error"
            title="Não foi possível carregar os usuários"
            description="Verifique sua conexão e tente novamente."
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </GlassPanel>
      ) : query.data?.length ? (
        <div className="grid gap-3">
          {query.data.map((user) => (
            <GlassPanel key={user.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                {user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-bold">{user.name}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.hasAuthAccess ? "Acesso autenticado disponível" : "Convite pendente"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={user.status === "Ativo" ? "positive" : "neutral"}>
                  {user.status}
                </StatusBadge>
                <StatusBadge>{USER_ROLE_LABELS[user.role]}</StatusBadge>
                {canManage && user.role !== "platform_admin" && (
                  <Button size="sm" variant="outline" onClick={() => open(user)}>
                    Editar
                  </Button>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <GlassPanel>
          <InterfaceState
            kind="empty"
            title="Nenhum usuário encontrado"
            description="Cadastre o primeiro integrante da equipe."
          />
        </GlassPanel>
      )}
      <GlassPanel className="mt-5 overflow-x-auto">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="text-primary" />
          <h2 className="font-display text-lg font-bold">Matriz de permissões</h2>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3">Módulo</th>
              {(["registry_admin", "manager", "operator"] as UserRole[]).map((role) => (
                <th key={role} className="px-3 text-center">
                  {USER_ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APP_MODULES.map((module) => (
              <tr key={module} className="border-b border-glass-border">
                <td className="py-3 font-medium">{MODULE_LABELS[module]}</td>
                {(["registry_admin", "manager", "operator"] as UserRole[]).map((role) => (
                  <td key={role} className="px-3 text-center">
                    {can(role, module) ? (
                      <Check className="mx-auto size-4 text-success" />
                    ) : (
                      <X className="mx-auto size-4 text-muted-foreground/40" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
      {(selected || creating) && (
        <Modal onClose={close}>
          <div className="flex items-center gap-3">
            <UserRound className="text-primary" />
            <h2 className="font-display text-xl font-bold">
              {selected ? "Editar usuário" : "Novo usuário"}
            </h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Field
              label="E-mail"
              value={form.email}
              disabled={Boolean(selected)}
              onChange={(email) => setForm({ ...form, email })}
            />
            <Field
              label="Telefone"
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
            <label className="text-sm font-medium">
              Perfil
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
                value={form.role}
                disabled={selected?.id === usuario?.id}
                onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
              >
                <option value="registry_admin">Administrador do cartório</option>
                <option value="manager">Gestor</option>
                <option value="operator">Operador</option>
              </select>
            </label>
            {selected && (
              <label className="text-sm font-medium">
                Status
                <select
                  className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
                  value={form.status}
                  disabled={selected.id === usuario?.id}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as RegistryUser["status"] })
                  }
                >
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
              </label>
            )}
          </div>
          {!selected && (
            <p className="mt-4 text-sm text-muted-foreground">
              O usuário receberá um convite por e-mail para definir a senha.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
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
    </div>
  );
}
