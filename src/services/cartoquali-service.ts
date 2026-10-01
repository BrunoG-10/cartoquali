import type { EvaluationPoint, EvaluationSubmission, ImprovementPlan, Indicators, QualityOccurrence, Registry, RegistryUser, Review, Survey, SurveyQuestion } from "@/types/cartoquali";
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
  getImprovementPlans(registryId: string): Promise<ImprovementPlan[]>;
}
