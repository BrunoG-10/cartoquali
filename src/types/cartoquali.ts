export type ReviewStatus = "Nova" | "Em análise" | "Respondida";
export type Resolution = "Sim" | "Parcialmente" | "Não";
export type ContactRequest = {
  requested: boolean;
  name?: string;
  channel?: string;
};
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
  resolution?: Resolution;
  improvementReasons?: string[];
  evaluationType?: "Ponto de avaliação";
  contact?: ContactRequest;
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
  slug?: string;
};

export type EvaluationSubmission = {
  rating: number;
  pointId: string;
  point: string;
  service: number;
  time: number;
  clarity: number;
  resolution: Resolution;
  comment: string;
  improvementReasons: string[];
  contact: ContactRequest;
};
