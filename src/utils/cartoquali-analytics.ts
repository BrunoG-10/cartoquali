import { QUALITY_METHODOLOGY } from "@/constants/cartoquali";
import type { DashboardPeriod, DimensionIndicator, EvaluationAnswer, ImprovementPlan, Indicators, QualityDimension, QualityDimensionKey, QualityEvolutionPoint, QualityFilters, QualityOccurrence, Review, SurveyQuestion } from "@/types/cartoquali";

const DAY = 86_400_000;
export const CARTOQUALI_NOW = new Date("2026-10-01T23:59:59-03:00");
const periodDays: Partial<Record<DashboardPeriod, number>> = { Hoje: 1, "7 dias": 7, "30 dias": 30, "90 dias": 90 };
const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const reviewDate = (review: Review, now = CARTOQUALI_NOW) => review.createdAt === "Agora" ? now : new Date(review.createdAt);

export function filterReviews(reviews: Review[], filters: QualityFilters, now = CARTOQUALI_NOW) {
  return reviews.filter((review) => {
    const date = reviewDate(review, now);
    const days = periodDays[filters.period];
    const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : undefined;
    const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : undefined;
    const inPeriod = filters.period === "Personalizado" ? (!start || date >= start) && (!end || date <= end) : filters.period === "Este ano" ? date >= new Date(now.getFullYear(), 0, 1) && date <= now : filters.period === "Este mês" ? date >= new Date(now.getFullYear(), now.getMonth(), 1) && date <= now : filters.period === "Mês anterior" ? date >= new Date(now.getFullYear(), now.getMonth() - 1, 1) && date < new Date(now.getFullYear(), now.getMonth(), 1) : days === undefined || now.getTime() - date.getTime() <= days * DAY;
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
export function calculatePreviousPeriod(reviews: Review[], filters: QualityFilters, now = CARTOQUALI_NOW) {
  const days=periodDays[filters.period];
  const start=filters.period==="Personalizado"&&filters.startDate?new Date(`${filters.startDate}T00:00:00`):filters.period==="Este ano"?new Date(now.getFullYear(),0,1):filters.period==="Este mês"?new Date(now.getFullYear(),now.getMonth(),1):filters.period==="Mês anterior"?new Date(now.getFullYear(),now.getMonth()-1,1):new Date(now.getTime()-(days??30)*DAY);
  const end=filters.period==="Personalizado"&&filters.endDate?new Date(`${filters.endDate}T23:59:59.999`):filters.period==="Mês anterior"?new Date(now.getFullYear(),now.getMonth(),1):now;
  const calendarMonth=["Este mês","Mês anterior"].includes(filters.period);
  const previousStart=calendarMonth?new Date(start.getFullYear(),start.getMonth()-1,1):new Date(start.getTime()-Math.max(DAY,end.getTime()-start.getTime()));
  return reviews.filter((review)=>{const date=reviewDate(review,now);return date>=previousStart&&date<start&&(!filters.pointId||review.pointId===filters.pointId)&&(!filters.rating||review.rating===filters.rating)&&(!filters.surveyId||review.surveyId===filters.surveyId);});
}
const dimensionValues = (reviews: Review[], key: QualityDimensionKey) => key === "resolution" ? reviews.filter((item) => item.resolution).map((item) => item.resolution === "Sim" ? 5 : item.resolution === "Parcialmente" ? 3 : 1) : reviews.map((item) => key === "structure" ? item.structure ?? item.rating : key === "general" ? item.rating : item[key]);
export function calculateQualityDimensions(reviews: Review[], previousReviews: Review[] = []): DimensionIndicator[] { return QUALITY_METHODOLOGY.dimensions.map((dimension) => { const values = dimensionValues(reviews, dimension.key); return { ...dimension, index: calculateDimensionIndex(values), responses: values.length, variation: calculateVariation(calculateDimensionIndex(values), calculateDimensionIndex(dimensionValues(previousReviews, dimension.key))) }; }); }
export function calculateConfiguredDimensions(reviews: Review[], answers: EvaluationAnswer[], questions: SurveyQuestion[], dimensions: QualityDimension[], previousReviews: Review[] = []): DimensionIndicator[] {
  const reviewIds=new Set(reviews.map((item)=>item.id)); const previousIds=new Set(previousReviews.map((item)=>item.id)); const questionMap=new Map(questions.map((item)=>[item.id,item]));
  const valuesFor=(dimensionId:string,ids:Set<string>)=>answers.filter((answer)=>ids.has(answer.reviewId)&&questionMap.get(answer.questionId)?.dimensionId===dimensionId).map((answer)=>typeof answer.value==="boolean"?(answer.value?5:1):typeof answer.value==="number"?answer.value:NaN).filter(Number.isFinite);
  return dimensions.filter((item)=>item.status==="Ativa").map((dimension)=>{const current=valuesFor(dimension.id,reviewIds);const previous=valuesFor(dimension.id,previousIds);return {...dimension,index:calculateDimensionIndex(current),responses:current.length,variation:calculateVariation(calculateDimensionIndex(current),calculateDimensionIndex(previous))};});
}
export function getQualityHighlights(dimensions: DimensionIndicator[], count = 2) { return [...dimensions].sort((a, b) => b.index - a.index).slice(0, count); }
export function getQualityAttentionPoints(dimensions: DimensionIndicator[], count = 2) { return [...dimensions].sort((a, b) => a.index - b.index).slice(0, count); }
export function buildQualityEvolution(reviews: Review[], pointId?: string, period: DashboardPeriod = "Este ano", now = CARTOQUALI_NOW): QualityEvolutionPoint[] {
  const scoped = reviews.filter((review) => !pointId || review.pointId === pointId);
  const shortDays = period === "Hoje" ? 1 : period === "7 dias" ? 7 : period === "30 dias" || period === "Este mês" || period === "Mês anterior" ? 30 : undefined;
  if (shortDays) {
    const bucketCount = shortDays <= 7 ? shortDays : 6;
    const bucketSize = Math.ceil(shortDays / bucketCount);
    return Array.from({ length: bucketCount }, (_, index) => {
      const end = new Date(now.getTime() - (bucketCount - index - 1) * bucketSize * DAY);
      const start = new Date(end.getTime() - bucketSize * DAY);
      const items = scoped.filter((review) => { const date=reviewDate(review,now); return date > start && date <= end; });
      const label = shortDays <= 7 ? end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : `${start.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}–${end.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}`;
      return { label, average: calculateAverageScore(items), satisfaction: calculateSatisfactionRate(items), resolution: calculateResolutionRate(items), negative: calculateNegativeRate(items), total: items.length };
    });
  }
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const items = scoped.filter((review) => { const value=reviewDate(review,now); return value.getFullYear()===date.getFullYear()&&value.getMonth()===date.getMonth(); });
    return { label: date.toLocaleDateString("pt-BR",{month:"short"}).replace(".",""), average: calculateAverageScore(items), satisfaction: calculateSatisfactionRate(items), resolution: calculateResolutionRate(items), negative: calculateNegativeRate(items), total: items.length };
  });
}
export function groupByPoint(reviews: Review[], pointIds: string[]) { return pointIds.map((pointId) => { const items = reviews.filter((item) => item.pointId === pointId); return { pointId, total: items.length, average: calculateAverageScore(items), satisfaction: calculateSatisfactionRate(items), resolution: calculateResolutionRate(items), negative: calculateNegativeRate(items) }; }); }
export function rankDissatisfaction(reviews: Review[]) { const counts = new Map<string, number>(); reviews.filter((item) => item.rating <= 3).forEach((item) => (item.improvementReasons?.length ? item.improvementReasons : [item.category]).forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1))); return [...counts.entries()].sort((a,b) => b[1] - a[1]); }
export function isPotentialAttention(review: Review) { return review.rating <= 3 && Boolean(review.comment.trim() || review.improvementReasons?.length); }
export function isPlanOverdue(plan: ImprovementPlan, today = "2026-10-01") { return !["Concluído", "Cancelado"].includes(plan.status) && plan.dueDate < today; }
export function calculateManagementSummary(occurrences: QualityOccurrence[], plans: ImprovementPlan[]) { return { openOccurrences: occurrences.filter((item) => !["Resolvida","Encerrada"].includes(item.status)).length, criticalOccurrences: occurrences.filter((item) => item.priority === "Crítica" && !["Resolvida","Encerrada"].includes(item.status)).length, activePlans: plans.filter((item) => item.status === "Em andamento").length, overduePlans: plans.filter((item) => isPlanOverdue(item)).length, completedPlans: plans.filter((item) => item.status === "Concluído").length }; }
export function buildManagementAlerts(occurrences: QualityOccurrence[], plans: ImprovementPlan[], dimensions: DimensionIndicator[]) { const alerts:string[]=[];const untreated=occurrences.filter((item)=>item.priority==="Crítica"&&["Nova","Em análise"].includes(item.status)).length;if(untreated)alerts.push(`${untreated} ${untreated===1?"ocorrência crítica está":"ocorrências críticas estão"} sem tratamento.`);const nearDue=plans.filter((item)=>!["Concluído","Cancelado"].includes(item.status)&&item.dueDate>="2026-10-01"&&item.dueDate<="2026-10-08").length;if(nearDue)alerts.push(`${nearDue} ${nearDue===1?"plano de melhoria está":"planos de melhoria estão"} próximo${nearDue===1?"":"s"} do prazo.`);const falling=[...dimensions].filter((item)=>item.variation<0).sort((a,b)=>a.variation-b.variation)[0];if(falling)alerts.push(`O índice de ${falling.label.toLowerCase()} caiu ${Math.abs(falling.variation).toFixed(1)} p.p. no período atual.`);return alerts; }
export function rankRecurringProblems(occurrences: QualityOccurrence[], category?: string) { const counts=new Map<string,number>();occurrences.filter((item)=>!category||category==="Todas"||item.category===category).forEach((item)=>counts.set(item.category,(counts.get(item.category)??0)+1));return [...counts.entries()].sort((a,b)=>b[1]-a[1]); }