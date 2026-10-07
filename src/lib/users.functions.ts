import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { primaryDbRole } from "@/lib/roles";
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
    role: dbToAppRole[primaryDbRole(row.user_roles) ?? ""] ?? "operator",
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
  if (!roles?.some((item: { role: string }) => item.role === "CARTORIO_ADMIN" || item.role === "PLATFORM_ADMIN")) throw new Error("Somente o administrador do cartório pode gerenciar usuários.");
  return caller as { id: string; cartorio_id: string };
}

export const listRegistryUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRegistryAdmin(context);
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
    await requireRegistryAdmin(context);
    const { data: duplicate } = await context.supabase.from("usuarios").select("id").ilike("email", data.email).maybeSingle();
    if (duplicate) throw new Error("Este e-mail já está em uso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (inviteError || !invited.user) throw new Error("Não foi possível criar o acesso e enviar o convite.");
    // create_registry_user inserts the profile and role in one transaction: on failure nothing was
    // written, so only the invited Auth account must be removed. Once it succeeds, never roll back.
    const { data: created, error: createError } = await context.supabase.rpc("create_registry_user", { _auth_user_id: invited.user.id, _name: data.name, _email: data.email, _phone: data.phone, _role: appToDbRole[data.role], _status: data.status === "Ativo" ? "ativo" : "inativo" });
    if (createError || !created) {
      // A lost response may hide a committed insert; keep the Auth account if a profile already uses it.
      const { data: linked } = await supabaseAdmin.from("usuarios").select("id").eq("auth_user_id", invited.user.id).maybeSingle();
      if (!linked) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
        if (deleteError) console.error("[users] invited auth user cleanup failed", deleteError.code);
      }
      throw new Error(createError?.message.includes("forbidden") ? "Você não possui permissão para criar usuários." : "Não foi possível cadastrar o usuário.");
    }
    const createdId = (created as { id: string }).id;
    const { data: profile, error: profileError } = await context.supabase.from("usuarios").select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at").eq("id", createdId).single();
    if (profileError || !profile) throw new Error("Usuário criado e convite enviado, mas não foi possível recarregar a lista. Atualize a página.");
    return mapUser({ ...profile, user_roles: [{ role: appToDbRole[data.role] }] } as UserRow);
  });

export const updateRegistryUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(100), phone: z.string().trim().max(30), role: editableRole, status: z.enum(["Ativo", "Inativo"]) }).parse(input))
  .handler(async ({ context, data }) => {
    await requireRegistryAdmin(context);
    // This form only edits registry roles; saving a platform administrator here would demote them.
    const { data: targetRoles } = await context.supabase.from("user_roles").select("role").eq("user_id", data.id);
    if (primaryDbRole(targetRoles) === "PLATFORM_ADMIN") throw new Error("O perfil de administrador da plataforma não pode ser alterado por esta tela.");
    const { error: updateError } = await context.supabase.rpc("update_registry_user", { _id:data.id, _name:data.name, _phone:data.phone, _role:appToDbRole[data.role], _status:data.status === "Ativo" ? "ativo" : "inativo" });
    if (updateError) {
      if(updateError.message.includes("self_access_change")) throw new Error("Você não pode remover o próprio acesso administrativo.");
      if(updateError.message.includes("last_registry_admin")) throw new Error("O último administrador ativo não pode ser removido.");
      if(updateError.message.includes("platform_admin_protected")) throw new Error("O perfil de administrador da plataforma não pode ser alterado por esta tela.");
      throw new Error("Não foi possível atualizar o usuário.");
    }
    const { data: updated, error } = await context.supabase.from("usuarios").select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at, user_roles(role)").eq("id", data.id).single();
    if (error || !updated) throw new Error("Não foi possível recarregar o usuário.");
    return mapUser(updated as UserRow);
  });