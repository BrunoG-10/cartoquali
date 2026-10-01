import type { DashboardPeriod, Indicators, Review, ReviewFilters } from "@/types/cartoquali";
const periodDays: Record<Exclude<DashboardPeriod, "Personalizado">, number> = { Hoje: 1, "7 dias": 7, "30 dias": 30, "90 dias": 90, "12 meses": 365 };
export function filterReviews(reviews: Review[], filters: ReviewFilters, now = new Date("2026-10-01T23:59:59")) {
  return reviews.filter((review) => {
    const date = review.createdAt === "Agora" ? now : new Date(review.createdAt);
    const days = filters.period === "Personalizado" ? undefined : periodDays[filters.period];
    const inPeriod = days === undefined || now.getTime() - date.getTime() <= days * 86_400_000;
    return inPeriod && (!filters.pointId || review.pointId === filters.pointId) && (!filters.rating || review.rating === filters.rating) && (!filters.category || review.category === filters.category) && (!filters.surveyId || review.surveyId === filters.surveyId) && (!filters.status || review.status === filters.status);
  });
}
export function calculateIndicators(reviews: Review[]): Indicators {
  const total = reviews.length;
  const distribution: Indicators["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => { distribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1; });
  const ratio = (value: number) => total ? Math.round(value / total * 1000) / 10 : 0;
  return { total, average: total ? reviews.reduce((sum, item) => sum + item.rating, 0) / total : 0, satisfaction: ratio(reviews.filter((item) => item.rating >= 4).length), resolution: ratio(reviews.filter((item) => item.resolution === "Sim" || item.resolved).length), time: total ? reviews.reduce((sum, item) => sum + item.time, 0) / total : 0, negative: reviews.filter((item) => item.rating <= 3).length, distribution };
}
export function groupByPoint(reviews: Review[], pointIds: string[]) { return pointIds.map((pointId) => { const items = reviews.filter((item) => item.pointId === pointId); return { pointId, total: items.length, average: items.length ? items.reduce((sum, item) => sum + item.rating, 0) / items.length : 0 }; }); }
export function rankDissatisfaction(reviews: Review[]) { const counts = new Map<string, number>(); reviews.filter((item) => item.rating <= 3).forEach((item) => (item.improvementReasons?.length ? item.improvementReasons : [item.category]).forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1))); return [...counts.entries()].sort((a,b) => b[1] - a[1]); }
