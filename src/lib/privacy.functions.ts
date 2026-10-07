import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const requestTypes = [
  "confirmacao",
  "acesso",
  "correcao",
  "informacao",
  "eliminacao",
  "oposicao",
  "revogacao",
  "outro",
] as const;
const requestStatuses = [
  "recebida",
  "em_analise",
  "aguardando_validacao",
  "concluida",
  "indeferida",
  "cancelada",
] as const;
const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(50).default(10),
  status: z.enum(requestStatuses).optional(),
  requestType: z.enum(requestTypes).optional(),
});
const createInput = z.object({
  requestType: z.enum(requestTypes),
  description: z.string().trim().min(3).max(4000),
  requesterContact: z.string().trim().min(3).max(255).optional(),
  responsibleUserId: z.string().uuid().optional(),
  evaluationId: z.string().uuid().optional(),
});
const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(requestStatuses),
  responsibleUserId: z.string().uuid().nullable(),
  internalNotes: z.string().trim().max(4000).nullable(),
});
const minimizeInput = z.object({
  requestId: z.string().uuid(),
  evaluationId: z.string().uuid(),
  redactFreeText: z.boolean(),
});

async function requirePrivacyAdmin(context: { supabase: any; userId: string }) {
  const { data: profile } = await context.supabase
    .from("usuarios")
    .select("id,cartorio_id,status")
    .eq("auth_user_id", context.userId)
    .maybeSingle();
  if (!profile || profile.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.id);
  if (
    !(roles ?? []).some((item: { role: string }) =>
      ["PLATFORM_ADMIN", "CARTORIO_ADMIN"].includes(item.role),
    )
  )
    throw new Error("Você não possui permissão para solicitações de privacidade.");
  return profile as { id: string; cartorio_id: string };
}

export const listPrivacyRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ context, data }) => {
    await requirePrivacyAdmin(context);
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase
      .from("privacy_requests")
      .select(
        "id,request_type,description,status,requester_contact,responsible_user_id,evaluation_id,internal_notes,created_at,updated_at,resolved_at",
        { count: "exact" },
      );
    if (data.status) query = query.eq("status", data.status);
    if (data.requestType) query = query.eq("request_type", data.requestType);
    const [{ data: rows, error, count }, { data: users }] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, from + data.pageSize - 1),
      context.supabase.from("usuarios").select("id,nome").eq("status", "ativo").order("nome"),
    ]);
    if (error) throw new Error("Não foi possível carregar as solicitações de privacidade.");
    const userMap = new Map(
      (users ?? []).map((user: { id: string; nome: string }) => [user.id, user.nome]),
    );
    return {
      rows: (rows ?? []).map((row: any) => ({
        ...row,
        responsible_name: row.responsible_user_id
          ? (userMap.get(row.responsible_user_id) ?? "Usuário indisponível")
          : null,
      })),
      total: count ?? 0,
      users: users ?? [],
    };
  });

export const createPrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ context, data }) => {
    const profile = await requirePrivacyAdmin(context);
    const { data: row, error } = await context.supabase
      .from("privacy_requests")
      .insert({
        cartorio_id: profile.cartorio_id,
        request_type: data.requestType,
        description: data.description,
        requester_contact: data.requesterContact ?? null,
        responsible_user_id: data.responsibleUserId ?? null,
        evaluation_id: data.evaluationId ?? null,
        created_by_id: profile.id,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Não foi possível registrar a solicitação.");
    return { id: row.id };
  });

export const updatePrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ context, data }) => {
    await requirePrivacyAdmin(context);
    const { error } = await context.supabase
      .from("privacy_requests")
      .update({
        status: data.status,
        responsible_user_id: data.responsibleUserId,
        internal_notes: data.internalNotes,
      })
      .eq("id", data.id);
    if (error)
      throw new Error(
        error.message.includes("closed")
          ? "Esta solicitação já está encerrada."
          : "Não foi possível atualizar a solicitação.",
      );
    return { ok: true };
  });

export const minimizeEvaluationData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => minimizeInput.parse(input))
  .handler(async ({ context, data }) => {
    await requirePrivacyAdmin(context);
    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: { message: string } | null }>;
    const { data: result, error } = await rpc("minimize_evaluation_personal_data", {
      _evaluation_id: data.evaluationId,
      _privacy_request_id: data.requestId,
      _redact_free_text: data.redactFreeText,
    });
    if (error)
      throw new Error(
        error.message.includes("not_found")
          ? "A solicitação e a avaliação precisam estar relacionadas."
          : "Não foi possível minimizar os dados.",
      );
    return result;
  });
