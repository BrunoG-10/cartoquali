import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { mockCartoQualiService, points as basePoints, reviews as baseReviews, type CartoQualiService } from "@/data/mock-service";
import type { EvaluationPoint, EvaluationSubmission, Review } from "@/types/cartoquali";

type SessionValue = {
  reviews: Review[];
  points: EvaluationPoint[];
  submitEvaluation(input: EvaluationSubmission): Promise<Review>;
};

const CartoQualiSession = createContext<SessionValue | undefined>(undefined);

export function CartoQualiSessionProvider({ children, service = mockCartoQualiService }: { children: ReactNode; service?: CartoQualiService }) {
  const [sessionReviews, setSessionReviews] = useState<Review[]>([]);
  const [pointActivity, setPointActivity] = useState<Record<string, number>>({});
  const submitEvaluation = async (input: EvaluationSubmission) => {
    const review = await service.submitEvaluation(input);
    setSessionReviews((current) => [review, ...current]);
    setPointActivity((current) => ({ ...current, [input.pointId]: (current[input.pointId] ?? 0) + 1 }));
    return review;
  };
  const value = useMemo<SessionValue>(() => ({
    reviews: [...sessionReviews, ...baseReviews],
    points: basePoints.map((point) => ({ ...point, reviews: point.reviews + (pointActivity[point.id] ?? 0), lastReview: pointActivity[point.id] ? "Agora" : point.lastReview })),
    submitEvaluation,
  }), [sessionReviews, pointActivity]);
  return <CartoQualiSession.Provider value={value}>{children}</CartoQualiSession.Provider>;
}

export function useCartoQualiSession() {
  const value = useContext(CartoQualiSession);
  if (!value) throw new Error("CartoQualiSessionProvider ausente");
  return value;
}