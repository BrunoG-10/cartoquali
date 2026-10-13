// Dimensões das perguntas da pesquisa — iguais ao CHECK de perguntas.dimensao no banco.
// (A dimensão "general" é dos planos de melhoria, não das perguntas.)
export const QUESTION_DIMENSIONS = [
  { key: "overall", label: "Satisfação geral" },
  { key: "service", label: "Cordialidade" },
  { key: "clarity", label: "Clareza" },
  { key: "time", label: "Tempo" },
  { key: "structure", label: "Instalações" },
  { key: "resolution", label: "Resolutividade" },
  { key: "comment", label: "Comentário ou sugestão" },
  { key: "contact", label: "Contato" },
] as const;

export type QuestionDimensionKey = (typeof QUESTION_DIMENSIONS)[number]["key"];

export const QUESTION_DIMENSION_KEYS = QUESTION_DIMENSIONS.map((d) => d.key) as [
  QuestionDimensionKey,
  ...QuestionDimensionKey[],
];

/** "Contato" é reservada ao sistema; não aparece no formulário. */
export const SELECTABLE_QUESTION_DIMENSIONS = QUESTION_DIMENSIONS.filter(
  (d) => d.key !== "contact",
);

/** Pergunta nova (extra) não entra nos índices até alguém escolher uma dimensão. */
export const DEFAULT_QUESTION_DIMENSION: QuestionDimensionKey = "comment";

export function questionDimensionLabel(key: string): string {
  return QUESTION_DIMENSIONS.find((d) => d.key === key)?.label ?? "";
}
