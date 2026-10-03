import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleMap = {
  PLATFORM_ADMIN: "platform_admin",
  CARTORIO_ADMIN: "registry_admin",
  GESTOR: "manager",
  OPERADOR: "operator",
} as const;

export const getCurrentAuthContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usuario, error } = await supabaseAdmin
      .from("usuarios")
      .select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at, updated_at")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o usuário.");
    if (!usuario) return { status: "missing_profile" as const };

    const [{ data: cartorio }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("cartorios").select("id, nome_fantasia, razao_social, status").eq("id", usuario.cartorio_id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", usuario.id),
    ]);
    if (!cartorio) return { status: "missing_registry" as const };
    if (usuario.status !== "ativo") return { status: "inactive_user" as const };
    if (cartorio.status !== "ativo") return { status: "inactive_registry" as const };
    const dbRole = roles?.[0]?.role as keyof typeof roleMap | undefined;
    if (!dbRole || !roleMap[dbRole]) return { status: "missing_role" as const };
    return {
      status: "active" as const,
      usuario: { id: usuario.id, registryId: usuario.cartorio_id, name: usuario.nome, email: usuario.email, phone: usuario.telefone ?? "", role: roleMap[dbRole], status: "Ativo" as const, lastAccess: "Agora", createdAt: usuario.created_at.slice(0, 10), recentActivity: ["Sessão autenticada"] },
      cartorio: { id: cartorio.id, name: cartorio.nome_fantasia, officialName: cartorio.razao_social },
      role: roleMap[dbRole],
    };
  });

export const listRealUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: caller } = await supabaseAdmin.from("usuarios").select("id, cartorio_id, status").eq("auth_user_id", context.userId).maybeSingle();
    if (!caller || caller.status !== "ativo") throw new Error("Acesso não autorizado.");
    const { data, error } = await supabaseAdmin.from("usuarios").select("id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at, user_roles(role)").eq("cartorio_id", caller.cartorio_id).order("nome");
    if (error) throw new Error("Não foi possível listar os usuários.");
    return data ?? [];
  });

export const inviteAdministrativeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: caller } = await supabaseAdmin.from("usuarios").select("id, cartorio_id, status").eq("auth_user_id", context.userId).maybeSingle();
    if (!caller || caller.status !== "ativo") throw new Error("Acesso não autorizado.");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles?.some((item) => item.role === "PLATFORM_ADMIN" || item.role === "CARTORIO_ADMIN")) throw new Error("Você não possui permissão para enviar convites.");
    const { data: target } = await supabaseAdmin.from("usuarios").select("id, auth_user_id, status").eq("cartorio_id", caller.cartorio_id).ilike("email", data.email).maybeSingle();
    if (!target) throw new Error("Cadastre o usuário funcional antes de enviar o convite.");
    if (target.status !== "ativo") throw new Error("Ative o usuário antes de enviar o convite.");
    if (target.auth_user_id) throw new Error("Este usuário já possui acesso autenticado.");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (error) throw new Error("Não foi possível enviar o convite.");
    if (!invited.user) throw new Error("Não foi possível criar o acesso autenticado.");
    const { error: linkError } = await supabaseAdmin.from("usuarios").update({ auth_user_id: invited.user.id }).eq("id", target.id).eq("cartorio_id", caller.cartorio_id);
    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      throw new Error("Não foi possível vincular o convite ao usuário.");
    }
    return { ok: true };
  });
