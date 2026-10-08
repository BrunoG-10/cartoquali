// Multiple-choice answers ("O que poderia ser melhorado?"). An answer is either the list of chosen
// options, or { values, other } when "Outro" carries a free-text description. The database
// (submit_public_evaluation) accepts both shapes and stores `other` in respostas.resposta_texto.

export type ChoiceAnswer = string[] | { values: string[]; other: string };

export const OTHER_TEXT_MAX = 300;

export const isOtherOption = (label: string) => /^outro\b(?!s)/i.test(label.trim());
export const isNothingOption = (label: string) => /^nada a melhorar/i.test(label.trim());

/** "Nada a melhorar" excludes every other option, and vice versa. */
export function toggleChoice(current: string[], option: string): string[] {
  if (current.includes(option)) return current.filter((item) => item !== option);
  if (isNothingOption(option)) return [option];
  return [...current.filter((item) => !isNothingOption(item)), option];
}

export function choiceValues(answer: unknown): string[] {
  if (Array.isArray(answer)) return answer.map(String);
  if (
    answer &&
    typeof answer === "object" &&
    Array.isArray((answer as { values?: unknown }).values)
  )
    return (answer as { values: unknown[] }).values.map(String);
  return [];
}

export function choiceOther(answer: unknown): string {
  if (answer && typeof answer === "object" && !Array.isArray(answer))
    return String((answer as { other?: unknown }).other ?? "");
  return "";
}

/** Readable answer for the evaluation detail: chosen options, with "Outro: <texto>" in place. */
export function describeAnswer(values: string[], text: string | null | undefined): string {
  const extra = text?.trim() ?? "";
  if (values.length && extra && values.some(isOtherOption))
    return values.map((value) => (isOtherOption(value) ? `${value}: ${extra}` : value)).join(" · ");
  return extra || values.join(" · ") || "Sem resposta";
}

/**
 * The free text only travels while an "Outro" option is selected and not blank. It is kept as
 * typed (trimming on every keystroke would eat the space before the next word); the server trims.
 */
export function choiceAnswer(values: string[], other: string): ChoiceAnswer {
  const text = other.slice(0, OTHER_TEXT_MAX);
  return text.trim() && values.some(isOtherOption) ? { values, other: text } : values;
}
