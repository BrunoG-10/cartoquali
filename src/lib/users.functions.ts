import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RegistryUser, UserRole } from "@/types/cartoquali";

const appToDbRole: Record<Exclude<UserRole, "platform_admin">, string> = {
  registry_admin: "CARTORIO_ADMIN",
  manager: "GESTOR",
  operator: "OPERADOR",
};
const dbToAppRole: Record<string, UserRole> = {
  PLATFORM_ADMIN: "platform_admin",
  CARTORIO_ADMIN: "registry_admin",
  GESTOR: "manager",
  OPERADOR: "operator",
};
const editableRole = z.enum(["registry_admin", "manager", "operator"]);
const userInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30),
  role: editableRole,
  status: z.enum(["Ativo", "Inativo"]),
});

type UserRow = {
  id: string;
  cartorio_id: string;
  auth_user_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  status: string;
  created_at: string;
  user_roles: Array<{ role: string }> | null;
};

function mapUser(row: UserRow): RegistryUser & { hasAuthAccess: boolean } {
  return {
    id: row.id,
    registryId: row.cartorio_id,
    name: row.nome,
    email: row.email,
    phone: row.telefone ?? "",
    role: dbToAppRole[row.user_roles?.[0]?.role ?? ""] ?? "operator",
    status: row.status === "ativo" ? "Ativo" : "Inativo",
    lastAccess: row.auth_user_id ? "Acesso provisionado" : "Convite pendente",
    createdAt: row.created_at.slice(0, 10),
    recentActivity: [],
    hasAuthAccess: Boolean(row.auth_user_id),
  };
}

async function requireRegistryAdmin(context: { supabase: Parameters<typeof authorize>[0]["supabase"]; userId: string }) {
  return authorize(context.supabase, context.userId);
}

async function authorize(supabase: any, authUserId: string) {
  const { data: caller } = await supabase.from("usuarios").select("id, cartorio_id, status").eq("auth_user_id", authUserId).maybeSingle();
  if (!caller || caller.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", caller.id);
  if (!roles?.some((item: { role: string }) => item.role === "CARTORIO_ADMIN")) throw new Error("Somente o administrador do cartório pode gerenciar usuários.");
  return caller as { id: string; cartorio_id: string };
}

export const listRegistryUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("usuarios")
      .select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at, user_roles(role)")
      .order("nome");
    if (error) throw new Error("Não foi possível carregar os usuários.");
    return (data ?? []).map((row) => mapUser(row as UserRow));
  });

export const createRegistryUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => userInput.extend({ redirectTo: z.string().url() }).parse(input))
  .handler(async ({ context, data }) => {
    const caller = await requireRegistryAdmin(context);
    const { data: duplicate } = await context.supabase.from("usuarios").select("id").ilike("email", data.email).maybeSingle();
    if (duplicate) throw new Error("Este e-mail já está em uso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (inviteError || !invited.user) throw new Error("Não foi possível criar o acesso e enviar o convite.");
    const userId = crypto.randomUUID();
    try {
      const { data: profile, error: profileError } = await context.supabase.from("usuarios").insert({
        id: userId,
        cartorio_id: caller.cartorio_id,
        auth_user_id: invited.user.id,
        nome: data.name,
        email: data.email.toLowerCase(),
        telefone: data.phone || null,
        status: data.status === "Ativo" ? "ativo" : "inativo",
      }).select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at").single();
      if (profileError || !profile) throw new Error("Não foi possível cadastrar o usuário.");
      const { error: roleError } = await context.supabase.from("user_roles").insert({ user_id: profile.id, role: appToDbRole[data.role] });
      if (roleError) throw new Error("Não foi possível definir o perfil do usuário.");
      return mapUser({ ...profile, user_roles: [{ role: appToDbRole[data.role] }] } as UserRow);
    } catch (error) {
      await context.supabase.from("usuarios").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      throw error;
    }
  });

export const updateRegistryUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(100), phone: z.string().trim().max(30), role: editableRole, status: z.enum(["Ativo", "Inativo"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const caller = await requireRegistryAdmin(context);
    if (data.id === caller.id && (data.status === "Inativo" || data.role !== "registry_admin")) throw new Error("Você não pode remover o próprio acesso administrativo.");
    const { data: existing } = await context.supabase.from("usuarios").select("id, cartorio_id").eq("id", data.id).maybeSingle();
    if (!existing) throw new Error("Usuário não encontrado.");
    const { error: userError } = await context.supabase.from("usuarios").update({ nome: data.name, telefone: data.phone || null, status: data.status === "Ativo" ? "ativo" : "inativo" }).eq("id", data.id);
    if (userError) throw new Error("Não foi possível atualizar o usuário.");
    const { error: deleteRoleError } = await context.supabase.from("user_roles").delete().eq("user_id", data.id);
    if (deleteRoleError) throw new Error("Não foi possível atualizar o perfil.");
    const { error: roleError } = await context.supabase.from("user_roles").insert({ user_id: data.id, role: appToDbRole[data.role] });
    if (roleError) throw new Error("Não foi possível atualizar o perfil.");
    const { data: updated, error } = await context.supabase.from("usuarios").select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at, user_roles(role)").eq("id", data.id).single();
    if (error || !updated) throw new Error("Não foi possível recarregar o usuário.");
    return mapUser(updated as UserRow);
  });