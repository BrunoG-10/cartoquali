export type ReviewStatus = "Nova" | "Em análise" | "Respondida";
export type Review = {
  id: string;
  date: string;
  rating: number;
  point: string;
  category: string;
  comment: string;
  status: ReviewStatus;
  service: number;
  time: number;
  clarity: number;
  resolved: boolean;
};
export type EvaluationPoint = {
  id: string;
  name: string;
  location: string;
  code: string;
  status: "Ativo" | "Inativo";
  method: string;
  reviews: number;
  lastReview: string;
};
