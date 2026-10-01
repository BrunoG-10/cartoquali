import type { ImprovementPlan, QualityOccurrence, ReportData, ReportFilters, ReportKind, ReportSource } from "@/types/cartoquali";
import { buildQualityEvolution, calculateConfiguredDimensions, calculateIndicators, calculateManagementSummary, calculatePreviousPeriod, filterReviews, groupByPoint, isPlanOverdue, rankDissatisfaction, rankRecurringProblems } from "@/utils/cartoquali-analytics";

const NOW = new Date("2026-10-01T18:36:00-03:00");
const DAY = 86_400_000;
const titles: Record<ReportKind, string> = {
  qualidade: "Relatório de Qualidade",
  satisfacao: "Relatório de Satisfação",
  avaliacoes: "Relatório de Avaliações",
  ocorrencias: "Relatório de Ocorrências",
  "planos-melhoria": "Relatório de Planos de Melhoria",
  executivo: "Visão Executiva da Qualidade",
};

function dateWindow(filters: ReportFilters) {
  if (filters.period === "Personalizado") return { start: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : undefined, end: filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : undefined };
  const days = { Hoje: 1, "7 dias": 7, "30 dias": 30, "90 dias": 90, "12 meses": 365 }[filters.period];
  return { start: new Date(NOW.getTime() - days * DAY), end: NOW };
}

function inWindow(value: string, filters: ReportFilters) {
  const { start, end } = dateWindow(filters);
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return (!start || date >= start) && (!end || date <= end);
}

function countBy<T>(items: T[], getLabel: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => { const label = getLabel(item); counts.set(label, (counts.get(label) ?? 0) + 1); });
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function filterOccurrences(items: QualityOccurrence[], filters: ReportFilters) {
  return items.filter((item) => inWindow(item.openedAt, filters) && (!filters.pointId || item.pointId === filters.pointId));
}

function filterPlans(items: ImprovementPlan[], filters: ReportFilters) {
  return items.filter((item) => inWindow(item.createdAt, filters) && (!filters.pointId || item.pointId === filters.pointId) && (!filters.dimensionId || item.dimension === filters.dimensionId));
}

function formatDate(value: Date) { return value.toLocaleDateString("pt-BR"); }
function periodLabel(filters: ReportFilters) {
  const { start, end } = dateWindow(filters);
  if (start && end) return `${formatDate(start)} a ${formatDate(end)}`;
  return filters.period;
}

function generate(kind: ReportKind, source: ReportSource, filters: ReportFilters): ReportData {
  const reviews = filterReviews(source.reviews, filters, NOW);
  const previousReviews = calculatePreviousPeriod(source.reviews, filters, NOW);
  const indicators = calculateIndicators(reviews);
  const previousIndicators = calculateIndicators(previousReviews);
  const allDimensions = calculateConfiguredDimensions(reviews, source.answers, source.questions, source.dimensions, previousReviews);
  const dimensions = filters.dimensionId ? allDimensions.filter((item) => item.id === filters.dimensionId) : allDimensions.filter((item) => item.key !== "general");
  const occurrences = filterOccurrences(source.occurrences, filters);
  const plans = filterPlans(source.improvementPlans, filters);
  const management = calculateManagementSummary(occurrences, plans);
  const dissatisfactionCounts = rankDissatisfaction(reviews);
  const negativeTotal = Math.max(1, indicators.negative);
  const completedPlans = plans.filter((item) => item.status === "Concluído").length;
  const resolvedDurations = occurrences.filter((item) => item.resolvedAt).map((item) => {
    const opened = new Date(`${item.openedAt.slice(0, 10)}T12:00:00`).getTime();
    const resolved = new Date(`${item.resolvedAt?.slice(0, 10)}T12:00:00`).getTime();
    return Math.max(0, (resolved - opened) / DAY);
  });
  const activeQuestionIds = new Set(source.questions.filter((question) => !filters.surveyId || question.surveyId === filters.surveyId).map((question) => question.id));
  const reviewIds = new Set(reviews.map((review) => review.id));
  const relevantAnswers = source.answers.filter((answer) => reviewIds.has(answer.reviewId) && activeQuestionIds.has(answer.questionId));
  const evidence = [
    { label: "avaliações analisadas", value: indicators.total },
    { label: "avaliações com nota ≤ 3", value: indicators.negative },
    ...dimensions.map((dimension) => ({ label: `respostas sobre ${dimension.label.toLowerCase()}`, value: dimension.responses })),
    { label: "respostas válidas", value: relevantAnswers.length },
  ];
  return {
    kind, title: titles[kind], generatedAt: NOW.toLocaleString("pt-BR"), periodLabel: periodLabel(filters), registry: source.registry, filters,
    reviews, previousReviews, indicators, previousIndicators, dimensions,
    evolution: buildQualityEvolution(source.reviews, filters.pointId),
    pointPerformance: groupByPoint(reviews, source.points.filter((point) => !filters.pointId || point.id === filters.pointId).map((point) => point.id)),
    dissatisfaction: dissatisfactionCounts.map(([label, count]) => ({ label, count, percentage: Number((count / negativeTotal * 100).toFixed(1)) })),
    occurrences,
    occurrenceByStatus: countBy(occurrences, (item) => item.status),
    occurrenceByCategory: countBy(occurrences, (item) => item.category),
    occurrenceByPriority: countBy(occurrences, (item) => item.priority),
    occurrenceByOwner: countBy(occurrences, (item) => item.owner),
    averageResolutionDays: resolvedDurations.length ? Number((resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length).toFixed(1)) : 0,
    recurringOccurrences: rankRecurringProblems(occurrences).map(([label, count]) => ({ label, count })),
    plans,
    planByStatus: countBy(plans, (item) => isPlanOverdue(item) ? "Atrasado" : item.status),
    overduePlans: plans.filter((item) => isPlanOverdue(item)),
    completionRate: plans.length ? Number((completedPlans / plans.length * 100).toFixed(1)) : 0,
    resultPlans: plans.filter((item) => item.indicatorBefore !== undefined && item.indicatorAfter !== undefined),
    management, evidence,
  };
}

export const reportService = {
  generateQualityReport: (source: ReportSource, filters: ReportFilters) => generate("qualidade", source, filters),
  generateSatisfactionReport: (source: ReportSource, filters: ReportFilters) => generate("satisfacao", source, filters),
  generateEvaluationReport: (source: ReportSource, filters: ReportFilters) => generate("avaliacoes", source, filters),
  generateOccurrenceReport: (source: ReportSource, filters: ReportFilters) => generate("ocorrencias", source, filters),
  generateImprovementReport: (source: ReportSource, filters: ReportFilters) => generate("planos-melhoria", source, filters),
  generateExecutiveReport: (source: ReportSource, filters: ReportFilters) => generate("executivo", source, filters),
};