// Formatação para o público brasileiro: números com vírgula, plural e telefone.

const oneDecimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const decimalBR = (value: number) => oneDecimal.format(value);
export const percentBR = (value: number) => `${oneDecimal.format(value)}%`;

export const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/** (86) 99999-9999 ou (86) 3222-0000 para números com DDD; outros formatos ficam como digitados. */
export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return "";
  if (value.trim().startsWith("+")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}
