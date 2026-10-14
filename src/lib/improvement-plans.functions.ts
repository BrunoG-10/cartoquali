import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { dbTimestamp } from "@/lib/timestamp";
import { loadTeam } from "@/lib/team";

const statuses = ["planejado", "em_andamento", "concluido", "cancelado"] as const;
const priorities = ["baixa", "media", "alta", "critica"] as const;
const dimensions = ["general", "service", "resolution", "time", "clarity", "structure"] as const;
const managingRoles = ["PLATFORM_ADMIN", "CARTORIO_ADMIN", "GESTOR"];

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(50).default(10),
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  responsibleId: z.string().uuid().optional(),
  occurrenceId: z.string().uuid().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});
const createInput = z.object({
  requestId: z.string().uuid(),
  occurrenceId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  problem: z.string().trim().min(1).max(4000),
  objective: z.string().trim().min(1).max(4000),
  action: z.string().trim().min(1).max(4000),
  responsibleId: z.string().uuid(),
  priority: z.enum(priorities),
  dueDate: z.string().date(),
  expectedResult: z.string().trim().max(4000).optional(),
  dimension: z.enum(dimensions).optional(),
});
const updateInput = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: dbTimestamp,
  title: z.string().trim().min(1).max(160),
  problem: z.string().trim().min(1).max(4000),
  objective: z.string().trim().min(1).max(4000),
  action: z.string().trim().min(1).max(4000),
  responsibleId: z.string().uuid().nullable(),
  priority: z.enum(priorities),
  dueDate: z.string().date(),
  status: z.enum(statuses),
  progress: z
    .number()
    .int()
    .refine((value) => [0, 25, 50, 75, 100].includes(value), "invalid_progress"),
  expectedResult: z.string().trim().max(4000).nullable(),
  result: z.string().trim().max(4000).nullable(),
  resultObservation: z.string().trim().max(4000).nullable(),
  indicatorName: z.string().trim().max(160).nullable(),
  indicatorBefore: z.number().min(0).max(100).nullable(),
  indicatorAfter: z.number().min(0).max(100).nullable(),
});

const columns =
  "id, ocorrencia_id, ponto_id, dimensao, titulo, problema, objetivo, acao, responsavel_id, prioridade, prazo, status, progresso, resultado_esperado, resultado, observacao_resultado, indicador_nome, indicador_antes, indicador_depois, concluido_em, created_at, updated_at, criado_por_id, concluido_por_id";

async function permissions(context: { supabase: any; userId: string }) {
  const { data: profile } = await context.supabase
    .from("usuarios")
    .select("id, nome, status")
    .eq("auth_user_id", context.userId)
    .maybeSingle();
  if (!profile || profile.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.id);
  const values = (roles ?? []).map((item: { role: string }) => item.role);
  return { profile, canManage: values.some((role: string) => managingRoles.includes(role)) };
}

export const listImprovementPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => listInput.parse(input))
  .handler(async ({ context, data }) => {
    const access = await permissions(context);
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase.from("planos_melhoria").select(columns, { count: "exact" });
    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("prioridade", data.priority);
    if (data.responsibleId) query = query.eq("responsavel_id", data.responsibleId);
    if (data.occurrenceId) query = query.eq("ocorrencia_id", data.occurrenceId);
    if (data.startDate) query = query.gte("prazo", data.startDate);
    if (data.endDate) query = query.lte("prazo", data.endDate);
    const {
      data: rows,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range(from, from + data.pageSize - 1);
    if (error) throw new Error("Não foi possível carregar os planos de melhoria.");
    const occurrenceIds = [
      ...new Set((rows ?? []).map((row: any) => row.ocorrencia_id)),
    ] as string[];
    const [team, { data: occurrences }, { data: filterOccurrences }] = await Promise.all([
      loadTeam(context.supabase),
      occurrenceIds.length
        ? context.supabase
            .from("ocorrencias_qualidade")
            .select("id, titulo")
            .in("id", occurrenceIds)
        : Promise.resolve({ data: [] }),
      context.supabase
        .from("ocorrencias_qualidade")
        .select("id, titulo, descricao, prioridade, ponto_id")
        .order("data_abertura", { ascending: false })
        .limit(100),
    ]);
    const occurrenceMap = new Map((occurrences ?? []).map((item: any) => [item.id, item.titulo]));
    return {
      items: (rows ?? []).map((row: any) => ({
        ...row,
        responsibleName: team.nameOf(row.responsavel_id),
        occurrenceTitle: occurrenceMap.get(row.ocorrencia_id) ?? "Ocorrência indisponível",
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      users: team.active,
      occurrences: filterOccurrences ?? [],
      canManage: access.canManage,
    };
  });

export const getImprovementPlanDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const access = await permissions(context);
    const { data: row, error } = await context.supabase
      .from("planos_melhoria")
      .select(columns)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o plano.");
    if (!row) return null;
    const [{ data: occurrence }, team, { data: logs }] = await Promise.all([
      context.supabase
        .from("ocorrencias_qualidade")
        .select("id, titulo, descricao, avaliacao_id")
        .eq("id", row.ocorrencia_id)
        .maybeSingle(),
      loadTeam(context.supabase),
      context.supabase
        .from("audit_logs")
        .select("id, user_id, action, metadata, created_at")
        .eq("entity", "improvement_plan")
        .eq("entity_id", row.id)
        .order("created_at", { ascending: false }),
    ]);
    return {
      ...row,
      responsibleName: team.nameOf(row.responsavel_id),
      creatorName: team.nameOf(row.criado_por_id),
      closerName: team.nameOf(row.concluido_por_id),
      occurrence,
      canManage: access.canManage,
      history: (logs ?? []).map((log: any) => ({
        id: log.id,
        action: log.action,
        metadata: log.metadata as Json,
        createdAt: log.created_at,
        userName: team.nameOf(log.user_id) ?? "Sistema",
      })),
    };
  });

export const createImprovementPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => createInput.parse(input))
  .handler(async ({ context, data }) => {
    await permissions(context);
    const params = {
      _client_request_id: data.requestId,
      _occurrence_id: data.occurrenceId,
      _title: data.title,
      _problem: data.problem,
      _objective: data.objective,
      _action: data.action,
      _responsible_id: data.responsibleId,
      _priority: data.priority,
      _due_date: data.dueDate,
      _expected_result: data.expectedResult ?? null,
      _dimension: data.dimension ?? null,
    };
    const callRpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: { message: string } | null }>;
    const { data: result, error } = await callRpc("create_improvement_plan", params);
    if (error) {
      if (error.message.includes("forbidden"))
        throw new Error("Você não possui permissão para criar planos.");
      if (error.message.includes("not_found"))
        throw new Error("A ocorrência ou o responsável não pertence ao seu cartório.");
      if (error.message.includes("invalid_due_date"))
        throw new Error("O prazo deve ser hoje ou uma data futura.");
      throw new Error("Não foi possível criar o plano.");
    }
    return result;
  });

export const updateImprovementPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateInput.parse(input))
  .handler(async ({ context, data }) => {
    await permissions(context);
    const params = {
      _id: data.id,
      _expected_updated_at: data.expectedUpdatedAt,
      _title: data.title,
      _problem: data.problem,
      _objective: data.objective,
      _action: data.action,
      _responsible_id: data.responsibleId,
      _priority: data.priority,
      _due_date: data.dueDate,
      _status: data.status,
      _progress: data.progress,
      _expected_result: data.expectedResult,
      _result: data.result,
      _result_observation: data.resultObservation,
      _indicator_name: data.indicatorName,
      _indicator_before: data.indicatorBefore,
      _indicator_after: data.indicatorAfter,
    };
    const callRpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: { message: string } | null }>;
    const { data: result, error } = await callRpc("update_improvement_plan", params);
    if (error) {
      if (error.message.includes("concurrent_update"))
        throw new Error(
          "Este plano foi alterado por outra pessoa. Atualize os dados e tente novamente.",
        );
      if (error.message.includes("invalid_status_transition"))
        throw new Error("Esta transição de status não é permitida.");
      if (error.message.includes("completion_details_required"))
        throw new Error("Informe responsável, resultado e observação antes de concluir.");
      if (error.message.includes("final_status"))
        throw new Error("Planos concluídos ou cancelados não podem ser reabertos.");
      if (error.message.includes("forbidden"))
        throw new Error("Você não possui permissão para alterar planos.");
      throw new Error("Não foi possível atualizar o plano.");
    }
    return result;
  });
