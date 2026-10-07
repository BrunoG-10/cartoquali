import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQualityReport, type QualityReportInput } from "@/lib/quality-reports.functions";
import {
  resolveDashboardRange,
  type RealDashboardFilters,
} from "@/components/cartoquali/use-real-dashboard";

export type RealReportFilters = RealDashboardFilters & {
  occurrenceStatus?: "nova" | "em_analise" | "em_tratamento" | "resolvida" | "encerrada";
  planStatus?: "planejado" | "em_andamento" | "concluido" | "cancelado";
};

export function reportInput(filters: RealReportFilters): QualityReportInput {
  const range = resolveDashboardRange(filters);
  return {
    ...range,
    ...(filters.pointId ? { pointId: filters.pointId } : {}),
    ...(filters.surveyId ? { surveyId: filters.surveyId } : {}),
    ...(filters.occurrenceStatus ? { occurrenceStatus: filters.occurrenceStatus } : {}),
    ...(filters.planStatus ? { planStatus: filters.planStatus } : {}),
  };
}

export function useQualityReport(filters: RealReportFilters) {
  const fetchReport = useServerFn(getQualityReport);
  const input = useMemo(() => reportInput(filters), [filters]);
  return useQuery({
    queryKey: ["quality-report", input],
    queryFn: () => fetchReport({ data: input }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
