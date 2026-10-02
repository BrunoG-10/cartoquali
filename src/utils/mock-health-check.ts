import type { EvaluationAnswer, EvaluationPoint, ImprovementPlan, QualityDimension, QualityOccurrence, RegistryUser, Review, Survey, SurveyQuestion } from "@/types/cartoquali";

type MockCollections = { registryId: string; users: RegistryUser[]; surveys: Survey[]; questions: SurveyQuestion[]; answers: EvaluationAnswer[]; dimensions: QualityDimension[]; points: EvaluationPoint[]; reviews: Review[]; occurrences: QualityOccurrence[]; plans: ImprovementPlan[] };

export function validateMockRelationships(data: MockCollections) {
  const errors: string[] = [];
  const ids = <T extends { id: string }>(items: T[]) => new Set(items.map((item) => item.id));
  const allCollections = [data.users,data.surveys,data.questions,data.answers,data.dimensions,data.points,data.reviews,data.occurrences,data.plans];
  allCollections.forEach((items) => { const seen=new Set<string>(); items.forEach((item)=>{if(seen.has(item.id))errors.push(`${item.id}: ID duplicado`);seen.add(item.id);}); });
  const surveyIds=ids(data.surveys), questionIds=ids(data.questions), dimensionIds=ids(data.dimensions), pointIds=ids(data.points), reviewIds=ids(data.reviews), userIds=ids(data.users), occurrenceIds=ids(data.occurrences);
  const scoped = [...data.users,...data.surveys,...data.questions,...data.answers,...data.dimensions,...data.points,...data.reviews,...data.occurrences,...data.plans];
  scoped.forEach((item) => { if (item.registryId !== data.registryId) errors.push(`${item.id}: cartório divergente`); });
  data.questions.forEach((item)=>{if(!surveyIds.has(item.surveyId))errors.push(`${item.id}: pesquisa inexistente`);if(!dimensionIds.has(item.dimensionId))errors.push(`${item.id}: dimensão inexistente`);if(item.condition&&!questionIds.has(item.condition.sourceQuestionId))errors.push(`${item.id}: pergunta condicional inexistente`);});
  data.points.forEach((item)=>{if(!surveyIds.has(item.surveyId))errors.push(`${item.id}: pesquisa inexistente`);});
  data.reviews.forEach((item)=>{if(!pointIds.has(item.pointId))errors.push(`${item.id}: ponto inexistente`);if(!surveyIds.has(item.surveyId))errors.push(`${item.id}: pesquisa inexistente`);});
  data.answers.forEach((item)=>{if(!reviewIds.has(item.reviewId))errors.push(`${item.id}: avaliação inexistente`);if(!questionIds.has(item.questionId))errors.push(`${item.id}: pergunta inexistente`);});
  data.occurrences.forEach((item)=>{if(item.reviewId&&!reviewIds.has(item.reviewId))errors.push(`${item.id}: avaliação inexistente`);if(item.pointId&&!pointIds.has(item.pointId))errors.push(`${item.id}: ponto inexistente`);if(item.ownerId&&!userIds.has(item.ownerId))errors.push(`${item.id}: responsável inexistente`);});
  data.plans.forEach((item)=>{if(item.occurrenceId&&!occurrenceIds.has(item.occurrenceId))errors.push(`${item.id}: ocorrência inexistente`);if(item.pointId&&!pointIds.has(item.pointId))errors.push(`${item.id}: ponto inexistente`);if(item.ownerId&&!userIds.has(item.ownerId))errors.push(`${item.id}: responsável inexistente`);});
  return errors;
}