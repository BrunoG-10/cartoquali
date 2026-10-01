import { QUALITY_METHODOLOGY } from "@/constants/cartoquali";
import type { DashboardPeriod, DimensionIndicator, Indicators, QualityDimensionKey, QualityEvolutionPoint, QualityFilters, Review } from "@/types/cartoquali";

const DAY = 86_400_000;
const NOW = new Date("2026-10-01T23:59:59");
const periodDays: Record<Exclude<DashboardPeriod, "Personalizado">, number> = { Hoje: 1, "7 dias": 7, "30 dias": 30, "90 dias": 90, "12 meses": 365 };
const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const reviewDate = (review: Review, now = NOW) => review.createdAt === "Agora" ? now : new Date(review.createdAt);

export function filterReviews(reviews: Review[], filters: QualityFilters, now = NOW) {
  return reviews.filter((review) => {
    const date = reviewDate(review, now);
    const days = filters.period === "Personalizado" ? undefined : periodDays[filters.period];
    const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : undefined;
    const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : undefined;
    const inPeriod = filters.period === "Personalizado" ? (!start || date >= start) && (!end || date <= end) : days === undefined || now.getTime() - date.getTime() <= days * DAY;
    return inPeriod && (!filters.pointId || review.pointId === filters.pointId) && (!filters.rating || review.rating === filters.rating) && (!filters.category || review.category === filters.category) && (!filters.surveyId || review.surveyId === filters.surveyId) && (!filters.status || review.status === filters.status);
  });
}
export function calculateAverageScore(reviews: Review[]) { return reviews.length ? round(reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length, 2) : 0; }
export function calculateSatisfactionRate(reviews: Review[]) { return reviews.length ? round(reviews.filter((item) => item.rating >= 4).length / reviews.length * 100) : 0; }
export function calculateNegativeRate(reviews: Review[]) { return reviews.length ? round(reviews.filter((item) => item.rating <= 3).length / reviews.length * 100) : 0; }
export function calculateResolutionRate(reviews: Review[]) { const valid = reviews.filter((item) => item.resolution); return valid.length ? round(valid.filter((item) => item.resolution === "Sim").length / valid.length * 100) : 0; }
export function calculateDimensionIndex(values: number[]) { return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length / 5 * 100) : 0; }
export function calculateVariation(current: number, previous: number) { return round(current - previous, 2); }
export function calculateIndicators(reviews: Review[]): Indicators { const distribution: Indicators["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; reviews.forEach((review) => { if (review.rating >= 1 && review.rating <= 5) distribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1; }); return { total: reviews.length, average: calculateAverageScore(reviews), satisfaction: calculateSatisfactionRate(reviews), resolution: calculateResolutionRate(reviews), time: reviews.length ? round(reviews.reduce((sum, item) => sum + item.time, 0) / reviews.length, 2) : 0, negative: reviews.filter((item) => item.rating <= 3).length, distribution }; }
export function calculatePreviousPeriod(reviews: Review[], filters: QualityFilters, now = NOW) { const days = filters.period === "Personalizado" ? 30 : periodDays[filters.period]; const start = filters.period === "Personalizado" && filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : new Date(now.getTime() - days * DAY); const end = filters.period === "Personalizado" && filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : now; const span = Math.max(DAY, end.getTime() - start.getTime()); return reviews.filter((review) => { const date = reviewDate(review, now); return date >= new Date(start.getTime() - span) && date < start && (!filters.pointId || review.pointId === filters.pointId) && (!filters.rating || review.rating === filters.rating) && (!filters.surveyId || review.surveyId === filters.surveyId); }); }
const dimensionValues = (reviews: Review[], key: QualityDimensionKey) => key === "resolution" ? reviews.filter((item) => item.resolution).map((item) => item.resolution === "Sim" ? 5 : item.resolution === "Parcialmente" ? 3 : 1) : reviews.map((item) => key === "structure" ? item.structure ?? item.rating : item[key]);
export function calculateQualityDimensions(reviews: Review[], previousReviews: Review[] = []): DimensionIndicator[] { return QUALITY_METHODOLOGY.dimensions.map((dimension) => { const values = dimensionValues(reviews, dimension.key); return { ...dimension, index: calculateDimensionIndex(values), responses: values.length, variation: calculateVariation(calculateDimensionIndex(values), calculateDimensionIndex(dimensionValues(previousReviews, dimension.key))) }; }); }
export function getQualityHighlights(dimensions: DimensionIndicator[], count = 2) { return [...dimensions].sort((a, b) => b.index - a.index).slice(0, count); }
export function getQualityAttentionPoints(dimensions: DimensionIndicator[], count = 2) { return [...dimensions].sort((a, b) => a.index - b.index).slice(0, count); }
export function buildQualityEvolution(reviews: Review[], pointId?: string): QualityEvolutionPoint[] { return ["Mai", "Jun", "Jul", "Ago", "Set", "Out"].map((label, index) => { const month = index + 4; const items = reviews.filter((review) => { const date = reviewDate(review); return date.getFullYear() === 2026 && date.getMonth() === month && (!pointId || review.pointId === pointId); }); return { label, average: calculateAverageScore(items), satisfaction: calculateSatisfactionRate(items), resolution: calculateResolutionRate(items), negative: calculateNegativeRate(items), total: items.length }; }); }
export function groupByPoint(reviews: Review[], pointIds: string[]) { return pointIds.map((pointId) => { const items = reviews.filter((item) => item.pointId === pointId); return { pointId, total: items.length, average: calculateAverageScore(items), satisfaction: calculateSatisfactionRate(items), negative: calculateNegativeRate(items) }; }); }
export function rankDissatisfaction(reviews: Review[]) { const counts = new Map<string, number>(); reviews.filter((item) => item.rating <= 3).forEach((item) => (item.improvementReasons?.length ? item.improvementReasons : [item.category]).forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1))); return [...counts.entries()].sort((a,b) => b[1] - a[1]); }
export function isPotentialAttention(review: Review) { return review.rating <= 3 && Boolean(review.comment.trim() || review.improvementReasons?.length); }