import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const occurrenceStatuses = [
  "nova",
  "em_analise",
  "em_tratamento",
  "resolvida",
  "encerrada",
] as const;
const planStatuses = ["planejado", "em_andamento", "concluido", "cancelado"] as const;

const reportInput = z.object({
  currentStart: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "invalid_datetime"),
  currentEnd: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "invalid_datetime"),
  previousStart: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "invalid_datetime"),
  previousEnd: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "invalid_datetime"),
  pointId: z.string().uuid().optional(),
  surveyId: z.string().uuid().optional(),
  occurrenceStatus: z.enum(occurrenceStatuses).optional(),
  planStatus: z.enum(planStatuses).optional(),
  granularity: z.enum(["day", "week", "month"]),
});

export type QualityReportInput = z.infer<typeof reportInput>;
export type QualityReportData = {
  registry: { id: string; trade_name: string; official_name: string };
  summary: {
    total: number;
    average: number | null;
    satisfaction: number | null;
    negative_rate: number | null;
    negative_count: number;
    comments: number;
    resolution: number | null;
  };
  previousSummary: {
    total: number;
    average: number | null;
    satisfaction: number | null;
    negative_rate: number | null;
    negative_count: number;
    resolution: number | null;
  };
  management: {
    occurrences_total: number;
    occurrences_resolved: number;
    plans_total: number;
    plans_completed: number;
    plans_active: number;
    plans_overdue: number;
  };
  distribution: Array<{ rating: number; count: number }>;
  series: Array<{
    bucket: string;
    total: number;
    average: number;
    satisfaction: number;
    negative_rate: number;
  }>;
  points: Array<{
    id: string;
    name: string;
    total: number;
    average: number | null;
    satisfaction: number | null;
    negative_rate: number | null;
  }>;
  dimensions: Array<{
    key: string;
    label: string;
    responses: number;
    index: number | null;
    previous_responses: number;
    previous_index: number | null;
  }>;
  evaluations: Array<{
    id: string;
    created_at: string;
    rating: number;
    resolution: string | null;
    comment: string | null;
    status: string;
    point_id: string;
    point_name: string;
    service_name?: string | null;
    survey_id: string;
    survey_name: string;
  }>;
  occurrences: Array<{
    id: string;
    evaluation_id: string | null;
    point_id: string | null;
    title: string;
    category: string;
    description: string;
    priority: string;
    status: string;
    origin: string;
    due_date: string | null;
    opened_at: string;
    resolved_at: string | null;
    owner: string | null;
  }>;
  plans: Array<{
    id: string;
    occurrence_id: string;
    point_id: string | null;
    dimension: string | null;
    title: string;
    problem: string;
    objective: string;
    action: string;
    priority: string;
    due_date: string;
    status: string;
    progress: number;
    expected_result: string | null;
    result: string | null;
    result_observation: string | null;
    indicator_name: string | null;
    indicator_before: number | null;
    indicator_after: number | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    owner: string | null;
  }>;
  occurrenceGroups: Array<{
    kind: "status" | "category" | "priority";
    label: string;
    count: number;
  }>;
  planGroups: Array<{ label: string; count: number }>;
  evidence: Array<{
    evaluation_id: string;
    evaluation_date: string;
    rating: number;
    comment: string | null;
    point_name: string;
    occurrence_id: string | null;
    occurrence_title: string | null;
    occurrence_category: string | null;
    occurrence_status: string | null;
    treatment: string | null;
    plan_id: string | null;
    plan_problem: string | null;
    plan_action: string | null;
    plan_due_date: string | null;
    plan_status: string | null;
    plan_result: string | null;
    responsible: string | null;
  }>;
  filters: {
    points: Array<{ id: string; name: string; surveyId: string }>;
    surveys: Array<{ id: string; name: string }>;
  };
};

async function runReport(context: { supabase: any }, data: QualityReportInput) {
  const params = {
    _current_start: data.currentStart,
    _current_end: data.currentEnd,
    _previous_start: data.previousStart,
    _previous_end: data.previousEnd,
    _point_id: data.pointId ?? null,
    _survey_id: data.surveyId ?? null,
    _occurrence_status: data.occurrenceStatus ?? null,
    _plan_status: data.planStatus ?? null,
    _granularity: data.granularity,
  };
  const callRpc = context.supabase.rpc.bind(context.supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: Json | null; error: { code?: string; message: string } | null }>;
  const { data: result, error } = await callRpc("get_quality_report", params);
  if (error) {
    console.error("quality report query failed", error.code ?? "unknown");
    throw new Error("Não foi possível gerar o relatório. Tente novamente.");
  }
  return result as unknown as QualityReportData;
}

export const getQualityReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportInput.parse(input))
  .handler(async ({ context, data }) => runReport(context, data));

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export const exportQualityReportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportInput.parse(input))
  .handler(async ({ context, data }) => {
    const report = await runReport(context, data);
    const { data: profile } = await context.supabase
      .from("usuarios")
      .select("id,status")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    const { data: roles } = profile
      ? await context.supabase.from("user_roles").select("role").eq("user_id", profile.id)
      : { data: [] };
    if (
      !profile ||
      profile.status !== "ativo" ||
      !(roles ?? []).some((item: { role: string }) =>
        ["PLATFORM_ADMIN", "CARTORIO_ADMIN", "GESTOR"].includes(item.role),
      )
    )
      throw new Error("Você não possui permissão para exportar relatórios.");
    // bind: an unbound supabase.rpc loses `this` and throws, which aborted every export.
    const privacyRpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
    await privacyRpc("log_privacy_event", {
      _action: "operational_report_exported",
      _entity: "quality_report",
      _entity_id: null,
      _metadata: { current_start: data.currentStart, current_end: data.currentEnd },
    });
    const header = ["data", "servico", "ponto", "pesquisa", "nota", "status", "comentario"];
    const rows = report.evaluations.map((item) => [
      item.created_at,
      item.service_name ?? "",
      item.point_name,
      item.survey_name,
      item.rating,
      item.status,
      item.comment,
    ]);
    return {
      filename: `cartoquali-relatorio-${data.currentStart.slice(0, 10)}-${data.currentEnd.slice(0, 10)}.csv`,
      content: `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`,
    };
  });
