import type { ImprovementPlanStatus, OccurrenceOrigin, OccurrencePriority, OccurrenceStatus, QualityMethodology, QuestionType, UserRole } from "@/types/cartoquali";
export const ACTIVE_REGISTRY_ID = "registry-cartorio-modelo";
export const USER_ROLE_LABELS: Record<UserRole, string> = { platform_admin: "Administrador da plataforma", registry_admin: "Administrador do cartório", manager: "Gestor", operator: "Operador" };
export const PERMISSION_MODULES = ["Dashboard", "Avaliações", "Pesquisas", "Pontos", "Qualidade", "Ocorrências", "Planos de melhoria", "Relatórios", "Usuários", "Configurações"] as const;
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = { platform_admin: ["global"], registry_admin: [...PERMISSION_MODULES], manager: ["Dashboard", "Avaliações", "Pesquisas", "Pontos", "Qualidade", "Ocorrências", "Planos de melhoria", "Relatórios"], operator: ["Dashboard", "Avaliações", "Qualidade", "Ocorrências"] };
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = { stars: "Estrelas 1–5", yes_no: "Sim/Não", scale: "Escala 1–5", text: "Texto", single_choice: "Seleção única", multiple_choice: "Seleção múltipla" };
export const OCCURRENCE_CATEGORIES = ["Atendimento", "Tempo", "Clareza", "Resolutividade", "Estrutura", "Processo", "Outro"] as const;
export const OCCURRENCE_STATUSES: readonly OccurrenceStatus[] = ["Nova", "Em análise", "Em tratamento", "Resolvida", "Encerrada"];
export const OCCURRENCE_PRIORITIES: readonly OccurrencePriority[] = ["Baixa", "Média", "Alta", "Crítica"];
export const OCCURRENCE_ORIGINS: readonly OccurrenceOrigin[] = ["Avaliação de usuário", "Indicador", "Equipe do cartório", "Auditoria interna", "Outro"];
export const IMPROVEMENT_PLAN_STATUSES: readonly ImprovementPlanStatus[] = ["Planejado", "Em andamento", "Concluído", "Cancelado"];
export const DASHBOARD_PERIODS = ["Hoje", "7 dias", "30 dias", "90 dias", "Este ano", "Personalizado"] as const;
export const QUALITY_METHODOLOGY: QualityMethodology = {
  version: "1.0",
  dimensions: [
    { id: "dim-service", registryId: ACTIVE_REGISTRY_ID, key: "service", label: "Atendimento", description: "Cordialidade e qualidade percebida no atendimento.", status: "Ativa" },
    { id: "dim-time", registryId: ACTIVE_REGISTRY_ID, key: "time", label: "Tempo", description: "Percepção do usuário sobre a duração e agilidade do atendimento.", status: "Ativa" },
    { id: "dim-clarity", registryId: ACTIVE_REGISTRY_ID, key: "clarity", label: "Clareza", description: "Compreensão das informações e orientações recebidas.", status: "Ativa" },
    { id: "dim-resolution", registryId: ACTIVE_REGISTRY_ID, key: "resolution", label: "Resolutividade", description: "Capacidade de resolver a necessidade apresentada.", status: "Ativa" },
    { id: "dim-structure", registryId: ACTIVE_REGISTRY_ID, key: "structure", label: "Estrutura", description: "Percepção sobre organização, conforto e sinalização.", status: "Ativa" },
    { id: "dim-general", registryId: ACTIVE_REGISTRY_ID, key: "general", label: "Geral", description: "Percepção geral sobre a experiência no cartório.", status: "Ativa" },
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
