import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  currentStart: z.string().datetime(),
  currentEnd: z.string().datetime(),
  previousStart: z.string().datetime(),
  previousEnd: z.string().datetime(),
  pointId: z.string().uuid().optional(),
  surveyId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  granularity: z.enum(["day", "week", "month"]),
});

export type DashboardSummary = {
  total: number;
  average: number | null;
  satisfaction: number | null;
  negative_rate: number | null;
  negative_count: number;
  comments: number;
  contact_requests: number;
  resolution: number | null;
};

export type DashboardIndicatorsData = {
  summary: DashboardSummary;
  previousSummary: DashboardSummary;
  distribution: Array<{ rating: number; count: number }>;
  series: Array<{
    bucket: string;
    total: number;
    average: number;
    satisfaction: number;
    negative_rate: number;
    resolution: number | null;
  }>;
  points: Array<{
    id: string;
    name: string;
    total: number;
    average: number | null;
    satisfaction: number | null;
    negative_rate: number | null;
  }>;
  /** Por serviço; ids "outro" e "nao_informado" agrupam "Outro serviço" e quem pulou a pergunta. */
  services?: Array<{
    id: string;
    name: string;
    total: number;
    average: number | null;
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
  recent: Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    point_name: string;
    service_name?: string | null;
  }>;
  filters: {
    points: Array<{ id: string; name: string }>;
    surveys: Array<{ id: string; name: string }>;
    services?: Array<{ id: string; name: string; attribution: string }>;
  };
};

export const getDashboardIndicators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const params: {
      _current_start: string;
      _current_end: string;
      _previous_start: string;
      _previous_end: string;
      _granularity: "day" | "week" | "month";
      _point_id?: string;
      _survey_id?: string;
      _servico_id?: string;
    } = {
      _current_start: data.currentStart,
      _current_end: data.currentEnd,
      _previous_start: data.previousStart,
      _previous_end: data.previousEnd,
      _granularity: data.granularity,
    };
    if (data.pointId) params._point_id = data.pointId;
    if (data.surveyId) params._survey_id = data.surveyId;
    if (data.serviceId) params._servico_id = data.serviceId;
    const { data: result, error } = await context.supabase.rpc("get_dashboard_indicators", params);
    if (error) {
      console.error("dashboard indicators query failed", error.code);
      throw new Error("Não foi possível carregar os indicadores. Tente novamente.");
    }
    return result as unknown as DashboardIndicatorsData;
  });
