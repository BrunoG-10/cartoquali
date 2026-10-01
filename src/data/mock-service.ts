import type { EvaluationPoint, Review } from "@/types/cartoquali";

export interface CartoQualiService {
  listReviews(): Promise<Review[]>;
  listPoints(): Promise<EvaluationPoint[]>;
}

export const reviews: Review[] = [
  { id: "0001284", date: "01/10/2026 10:42", rating: 5, point: "Recepção", category: "Atendimento", comment: "Atendimento rápido e muito bem explicado.", status: "Nova", service: 5, time: 4, clarity: 5, resolved: true },
  { id: "0001283", date: "01/10/2026 09:18", rating: 3, point: "Balcão 01", category: "Tempo", comment: "A fila estava um pouco demorada hoje.", status: "Em análise", service: 4, time: 2, clarity: 4, resolved: true },
  { id: "0001282", date: "30/09/2026 16:35", rating: 5, point: "Saída", category: "Clareza", comment: "Todas as etapas foram explicadas com clareza.", status: "Respondida", service: 5, time: 5, clarity: 5, resolved: true },
  { id: "0001281", date: "30/09/2026 14:06", rating: 2, point: "Recepção", category: "Informações", comment: "Não encontrei orientação sobre os documentos necessários.", status: "Em análise", service: 3, time: 3, clarity: 2, resolved: false },
  { id: "0001280", date: "29/09/2026 11:20", rating: 4, point: "Balcão 01", category: "Atendimento", comment: "Equipe cordial e serviço resolvido.", status: "Respondida", service: 5, time: 3, clarity: 4, resolved: true },
];

export const points: EvaluationPoint[] = [
  { id: "recepcao", name: "Recepção", location: "Entrada principal", code: "CQ-REC-001", status: "Ativo", method: "NFC + QR Code", reviews: 586, lastReview: "Há 12 min" },
  { id: "balcao-01", name: "Balcão 01", location: "Salão de atendimento", code: "CQ-BAL-001", status: "Ativo", method: "NFC + QR Code", reviews: 421, lastReview: "Há 28 min" },
  { id: "saida", name: "Saída", location: "Próximo à porta lateral", code: "CQ-SAI-001", status: "Ativo", method: "NFC + QR Code", reviews: 277, lastReview: "Há 1 h" },
];

export const dashboardByPeriod = {
  "30 dias": { satisfaction: "94,7%", reviews: "1.284", average: "4,7", resolved: "92,4%", negative: "37", bars: [54, 62, 58, 69, 77, 86, 94] },
  "90 dias": { satisfaction: "93,8%", reviews: "3.742", average: "4,6", resolved: "91,9%", negative: "103", bars: [49, 56, 64, 60, 73, 81, 90] },
  "12 meses": { satisfaction: "92,9%", reviews: "14.806", average: "4,6", resolved: "90,8%", negative: "412", bars: [45, 51, 57, 66, 71, 79, 88] },
} as const;

export const mockCartoQualiService: CartoQualiService = {
  async listReviews() { return reviews; },
  async listPoints() { return points; },
};
