import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { primaryDbRole } from "@/lib/roles";
import { untypedDb } from "@/lib/untyped-db";

export type GuideProgress = { step: number; completedAt: string | null };

const roleMap = {
  PLATFORM_ADMIN: "platform_admin",
  CARTORIO_ADMIN: "registry_admin",
  GESTOR: "manager",
  OPERADOR: "operator",
} as const;

export const getCurrentAuthContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: usuario, error } = await context.supabase
      .from("usuarios")
      .select(
        "id, cartorio_id, auth_user_id, nome, email, telefone, status, created_at, updated_at",
      )
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o usuário.");
    if (!usuario) return { status: "missing_profile" as const };

    const [{ data: cartorio }, { data: roles }] = await Promise.all([
      context.supabase
        .from("cartorios")
        .select("id, nome_fantasia, razao_social, status")
        .eq("id", usuario.cartorio_id)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", usuario.id),
    ]);
    if (!cartorio) return { status: "missing_registry" as const };
    if (usuario.status !== "ativo") return { status: "inactive_user" as const };
    if (cartorio.status !== "ativo") return { status: "inactive_registry" as const };
    const dbRole = primaryDbRole(roles);
    if (!dbRole || !roleMap[dbRole]) return { status: "missing_role" as const };
    // Guia de uso: linha ausente = nunca começou; erro de leitura = null (o tour não abre sozinho).
    const { data: progress, error: progressError } = await untypedDb(context.supabase)
      .from("guia_progresso")
      .select("etapa, concluido_em")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    const guide: GuideProgress | null = progressError
      ? null
      : {
          step: Number(progress?.etapa ?? 0),
          completedAt: (progress?.concluido_em as string | null | undefined) ?? null,
        };
    return {
      guide,
      status: "active" as const,
      usuario: {
        id: usuario.id,
        registryId: usuario.cartorio_id,
        name: usuario.nome,
        email: usuario.email,
        phone: usuario.telefone ?? "",
        role: roleMap[dbRole],
        status: "Ativo" as const,
        lastAccess: "Agora",
        createdAt: usuario.created_at.slice(0, 10),
        recentActivity: ["Sessão autenticada"],
      },
      cartorio: {
        id: cartorio.id,
        name: cartorio.nome_fantasia,
        officialName: cartorio.razao_social,
      },
      role: roleMap[dbRole],
    };
  });
