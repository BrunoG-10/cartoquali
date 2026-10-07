import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardIndicators } from "@/lib/dashboard-indicators.functions";
import type { DashboardPeriod } from "@/types/cartoquali";

export type RealDashboardFilters = {
  period: DashboardPeriod;
  pointId?: string | undefined;
  surveyId?: string | undefined;
  serviceId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

const SAO_PAULO_OFFSET = "-03:00";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function isoDate(date: Date) {
  return dateFormatter.format(date);
}
function atStart(date: string) {
  return new Date(`${date}T00:00:00${SAO_PAULO_OFFSET}`);
}
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
function monthBoundary(year: number, month: number) {
  return atStart(`${year}-${String(month + 1).padStart(2, "0")}-01`);
}

export function resolveDashboardRange(filters: RealDashboardFilters, now = new Date()) {
  const todayText = isoDate(now);
  const today = atStart(todayText);
  const parts = todayText.split("-").map(Number);
  const year = parts[0] ?? now.getUTCFullYear();
  const month = parts[1] ?? now.getUTCMonth() + 1;
  let start = today;
  let end = addDays(today, 1);
  if (filters.period === "7 dias") start = addDays(today, -6);
  if (filters.period === "30 dias") start = addDays(today, -29);
  if (filters.period === "90 dias") start = addDays(today, -89);
  if (filters.period === "Este mês") {
    start = monthBoundary(year, month - 1);
    end = monthBoundary(year, month);
  }
  if (filters.period === "Mês anterior") {
    start = monthBoundary(year, month - 2);
    end = monthBoundary(year, month - 1);
  }
  if (filters.period === "Este ano") {
    start = atStart(`${year}-01-01`);
    end = atStart(`${year + 1}-01-01`);
  }
  if (filters.period === "Personalizado" && filters.startDate && filters.endDate) {
    start = atStart(filters.startDate);
    end = addDays(atStart(filters.endDate), 1);
  }
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start);
  const previousStart = new Date(start.getTime() - duration);
  const days = Math.ceil(duration / 86_400_000);
  return {
    currentStart: start.toISOString(),
    currentEnd: end.toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: previousEnd.toISOString(),
    granularity: (days <= 31 ? "day" : days <= 120 ? "week" : "month") as "day" | "week" | "month",
  };
}

export function useRealDashboard(filters: RealDashboardFilters) {
  const fetchIndicators = useServerFn(getDashboardIndicators);
  const range = useMemo(() => resolveDashboardRange(filters), [filters]);
  return useQuery({
    queryKey: ["dashboard-indicators", filters, range],
    queryFn: () => {
      const data: typeof range & { pointId?: string; surveyId?: string; serviceId?: string } = {
        ...range,
      };
      if (filters.pointId) data.pointId = filters.pointId;
      if (filters.surveyId) data.surveyId = filters.surveyId;
      if (filters.serviceId) data.serviceId = filters.serviceId;
      return fetchIndicators({ data });
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
