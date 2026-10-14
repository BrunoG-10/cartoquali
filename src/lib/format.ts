// Formatação para o público brasileiro: números com vírgula, plural e telefone.

const oneDecimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const decimalBR = (value: number) => oneDecimal.format(value);
export const percentBR = (value: number) => `${oneDecimal.format(value)}%`;

export const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/**
 * Valor em reais como se digita no Brasil: "199,90", "1.500", "1.500,00", "R$ 300".
 * Sem vírgula, pontos em grupos de três são milhar ("1.500" = 1500); um ponto isolado é decimal
 * ("199.9", o formato antigo dos campos). Texto que não é valor vira NaN.
 */
export function parseMoneyBR(text: string): number {
  const value = text.replace(/R\$/i, "").replace(/\s/g, "");
  if (!value) return Number.NaN;
  if (value.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(value)) return Number.NaN;
    return Number(value.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(value)) return Number(value.replace(/\./g, ""));
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : Number.NaN;
}

/** Valor para preencher um campo: "199,90". */
export const moneyInputBR = (value: number) => value.toFixed(2).replace(".", ",");

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
