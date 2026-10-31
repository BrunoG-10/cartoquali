// Motivos de melhoria (avaliacoes.motivos): códigos fixos que o banco deriva das opções marcadas
// em "O que poderia melhorar?" nas notas de 1 a 3 (cartoquali_private.motivo_codigo).

export const REASON_CODES = [
  "demora",
  "atendimento",
  "informacao",
  "ambiente",
  "resolucao",
  "outro",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const REASON_LABELS: Record<ReasonCode, string> = {
  demora: "Demora",
  atendimento: "Atendimento",
  informacao: "Informação",
  ambiente: "Ambiente",
  resolucao: "Resolução do pedido",
  outro: "Outro",
};

/** Categoria sugerida para a ocorrência aberta a partir da avaliação (a equipe pode trocar). */
export const REASON_CATEGORY = {
  demora: "tempo",
  atendimento: "atendimento",
  informacao: "clareza",
  ambiente: "estrutura",
  resolucao: "resolutividade",
  outro: "outro",
} as const satisfies Record<ReasonCode, string>;

export const isReasonCode = (value: unknown): value is ReasonCode =>
  typeof value === "string" && (REASON_CODES as readonly string[]).includes(value);

export const reasonCodes = (value: unknown): ReasonCode[] =>
  Array.isArray(value) ? value.filter(isReasonCode) : [];
