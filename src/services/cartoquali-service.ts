import type { CreateImprovementPlanInput, CreateOccurrenceInput, EvaluationPoint, EvaluationSubmission, ImprovementPlan, ImprovementPlanStatus, Indicators, OccurrenceStatus, QualityOccurrence, Registry, RegistryUser, Review, Survey, SurveyQuestion, UpdateImprovementPlanInput, UpdateOccurrenceInput } from "@/types/cartoquali";
export interface CartoQualiService {
  getRegistry(id: string): Promise<Registry | undefined>;
  getUsers(registryId: string): Promise<RegistryUser[]>;
  getPoints(registryId: string): Promise<EvaluationPoint[]>;
  getSurveys(registryId: string): Promise<Survey[]>;
  getQuestions(surveyId: string): Promise<SurveyQuestion[]>;
  getReviews(registryId: string): Promise<Review[]>;
  getReviewById(id: string): Promise<Review | undefined>;
  createReview(input: EvaluationSubmission): Promise<Review>;
  getIndicators(registryId: string): Promise<Indicators>;
  getOccurrences(registryId: string): Promise<QualityOccurrence[]>;
  getOccurrenceById(id: string): Promise<QualityOccurrence | undefined>;
  createOccurrence(input: CreateOccurrenceInput): Promise<QualityOccurrence>;
  updateOccurrence(id: string, input: UpdateOccurrenceInput): Promise<QualityOccurrence | undefined>;
  updateOccurrenceStatus(id: string, status: OccurrenceStatus): Promise<QualityOccurrence | undefined>;
  getImprovementPlans(registryId: string): Promise<ImprovementPlan[]>;
  getImprovementPlanById(id: string): Promise<ImprovementPlan | undefined>;
  createImprovementPlan(input: CreateImprovementPlanInput): Promise<ImprovementPlan>;
  updateImprovementPlan(id: string, input: UpdateImprovementPlanInput): Promise<ImprovementPlan | undefined>;
  updateImprovementPlanStatus(id: string, status: ImprovementPlanStatus): Promise<ImprovementPlan | undefined>;
}
