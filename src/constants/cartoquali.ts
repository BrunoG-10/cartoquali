import type { ImprovementPlanStatus, OccurrencePriority, OccurrenceStatus, QualityMethodology, QuestionType, UserRole } from "@/types/cartoquali";
export const ACTIVE_REGISTRY_ID = "registry-cartorio-modelo";
export const USER_ROLE_LABELS: Record<UserRole, string> = { platform_admin: "Administrador da plataforma", registry_admin: "Administrador do cartório", manager: "Gestor", operator: "Operador" };
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = { platform_admin: ["global"], registry_admin: ["dashboard", "reviews", "quality", "reports", "settings", "users"], manager: ["dashboard", "reviews", "quality", "reports"], operator: ["reviews"] };
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = { stars: "Estrelas", single_choice: "Escolha única", multiple_choice: "Múltipla escolha", text: "Texto", yes_no: "Sim/não" };
export const OCCURRENCE_CATEGORIES = ["Atendimento", "Tempo", "Informação", "Serviço", "Estrutura", "Sistema", "Outro"] as const;
export const OCCURRENCE_STATUSES: readonly OccurrenceStatus[] = ["Nova", "Em análise", "Em tratamento", "Resolvida", "Encerrada"];
export const OCCURRENCE_PRIORITIES: readonly OccurrencePriority[] = ["Baixa", "Média", "Alta", "Crítica"];
export const IMPROVEMENT_PLAN_STATUSES: readonly ImprovementPlanStatus[] = ["Planejado", "Em andamento", "Concluído", "Cancelado"];
export const DASHBOARD_PERIODS = ["Hoje", "7 dias", "30 dias", "90 dias", "12 meses", "Personalizado"] as const;
export const QUALITY_METHODOLOGY: QualityMethodology = {
  version: "1.0",
  dimensions: [
    { key: "service", label: "Atendimento", description: "Cordialidade e qualidade percebida no atendimento." },
    { key: "time", label: "Tempo", description: "Percepção sobre espera e duração do atendimento." },
    { key: "clarity", label: "Clareza", description: "Compreensão das informações e orientações recebidas." },
    { key: "resolution", label: "Resolutividade", description: "Percentual de atendimentos declarados como resolvidos." },
    { key: "structure", label: "Estrutura", description: "Percepção sobre organização, conforto e sinalização." },
  ],
  indicators: [
    { key: "satisfaction", label: "Satisfação", definition: "Percentual de avaliações com nota geral de 4 ou 5 estrelas." },
    { key: "average", label: "Nota média", definition: "Soma das notas gerais dividida pela quantidade de avaliações válidas." },
    { key: "negative", label: "Avaliações negativas", definition: "Percentual de avaliações com nota geral de 1, 2 ou 3 estrelas." },
    { key: "resolution", label: "Resolutividade", definition: "Percentual de respostas “Sim” à pergunta sobre resolução do atendimento." },
    { key: "dimensions", label: "Índices dimensionais", definition: "Média da dimensão, dividida por 5 e convertida para a escala de 0 a 100." },
    { key: "evolution", label: "Evolução", definition: "Comparação do indicador selecionado ao longo dos períodos." },
  ],
  formulas: { satisfaction: "Avaliações com nota 4 ou 5 ÷ avaliações válidas × 100", average: "Soma das notas gerais ÷ avaliações válidas", negative: "Avaliações com nota de 1 a 3 ÷ avaliações válidas × 100", resolution: "Respostas Sim ÷ respostas válidas × 100", dimension: "Média das respostas ÷ 5 × 100" },
  questionMappings: { service: "q-rating", time: "q-time", clarity: "q-clarity", resolution: "q-resolution", structure: "q-structure" },
};
