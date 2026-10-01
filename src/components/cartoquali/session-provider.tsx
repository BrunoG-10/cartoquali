import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ACTIVE_REGISTRY_ID } from "@/constants/cartoquali";
import { improvementPlans as basePlans, mockCartoQualiService, occurrences as baseOccurrences, points as basePoints, registry, reviews as baseReviews, surveys, users } from "@/data/mock-service";
import type { CartoQualiService } from "@/services/cartoquali-service";
import type { EvaluationPoint, EvaluationSubmission, ImprovementPlan, QualityOccurrence, Review } from "@/types/cartoquali";

type SessionValue = { registry: typeof registry; users: typeof users; surveys: typeof surveys; reviews: Review[]; points: EvaluationPoint[]; occurrences: QualityOccurrence[]; improvementPlans: ImprovementPlan[]; submitEvaluation(input: EvaluationSubmission): Promise<Review>; addOccurrence(input: Omit<QualityOccurrence,"id"|"registryId"|"openedAt">): void };
const CartoQualiSession = createContext<SessionValue | undefined>(undefined);
export function CartoQualiSessionProvider({ children, service = mockCartoQualiService }: { children: ReactNode; service?: CartoQualiService }) {
 const [sessionReviews,setSessionReviews]=useState<Review[]>([]); const [pointActivity,setPointActivity]=useState<Record<string,number>>({}); const [sessionOccurrences,setSessionOccurrences]=useState<QualityOccurrence[]>([]);
 const submitEvaluation=async(input:EvaluationSubmission)=>{const review=await service.createReview(input);setSessionReviews((current)=>[review,...current]);setPointActivity((current)=>({...current,[input.pointId]:(current[input.pointId]??0)+1}));return review;};
 const addOccurrence=(input:Omit<QualityOccurrence,"id"|"registryId"|"openedAt">)=>setSessionOccurrences((current)=>[{...input,id:`occ-session-${current.length+1}`,registryId:ACTIVE_REGISTRY_ID,openedAt:"2026-10-01"},...current]);
 const value=useMemo<SessionValue>(()=>({registry,users,surveys,reviews:[...sessionReviews,...baseReviews].filter((item)=>item.registryId===registry.id),points:basePoints.filter((item)=>item.registryId===registry.id).map((point)=>({...point,reviews:point.reviews+(pointActivity[point.id]??0),lastReview:pointActivity[point.id]?"Agora":point.lastReview})),occurrences:[...sessionOccurrences,...baseOccurrences].filter((item)=>item.registryId===registry.id),improvementPlans:basePlans.filter((item)=>item.registryId===registry.id),submitEvaluation,addOccurrence}),[sessionReviews,pointActivity,sessionOccurrences]);
 return <CartoQualiSession.Provider value={value}>{children}</CartoQualiSession.Provider>;
}
export function useCartoQualiSession(){const value=useContext(CartoQualiSession);if(!value)throw new Error("CartoQualiSessionProvider ausente");return value;}
