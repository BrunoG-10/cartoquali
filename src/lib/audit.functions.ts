import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
  entity: z.string().max(60).optional(),
  action: z.string().max(100).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => input.parse(value))
  .handler(async ({ context, data }) => {
    const { data: caller } = await context.supabase
      .from("usuarios")
      .select("id,status")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!caller || caller.status !== "ativo") throw new Error("Acesso não autorizado.");
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    if (!roles?.some((item) => ["PLATFORM_ADMIN", "CARTORIO_ADMIN"].includes(item.role)))
      throw new Error("Você não possui permissão para consultar a auditoria.");
    let query = context.supabase
      .from("audit_logs")
      .select(
        "id,user_id,action,entity,entity_id,metadata,created_at,usuarios!audit_logs_user_id_cartorio_id_fkey(nome)",
        { count: "exact" },
      );
    if (data.entity) query = query.eq("entity", data.entity);
    if (data.action) query = query.eq("action", data.action);
    if (data.userId) query = query.eq("user_id", data.userId);
    if (data.startDate) query = query.gte("created_at", `${data.startDate}T00:00:00-03:00`);
    if (data.endDate) query = query.lt("created_at", `${data.endDate}T23:59:59.999-03:00`);
    const from = (data.page - 1) * data.pageSize;
    const {
      data: rows,
      count,
      error,
    } = await query.order("created_at", { ascending: false }).range(from, from + data.pageSize - 1);
    if (error) throw new Error("Não foi possível carregar a auditoria.");
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });
