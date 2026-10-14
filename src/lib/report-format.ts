// Rótulos e formatos dos relatórios, compartilhados pela tela, pela impressão (PDF) e pelo CSV.
import { decimalBR } from "@/lib/format";

export const OCCURRENCE_STATUS_LABELS: Record<string, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  em_tratamento: "Em tratamento",
  resolvida: "Resolvida",
  encerrada: "Encerrada",
};
export const PLAN_STATUS_LABELS: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
export const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};
export const CATEGORY_LABELS: Record<string, string> = {
  atendimento: "Atendimento",
  tempo: "Tempo",
  clareza: "Clareza",
  resolutividade: "Resolutividade",
  estrutura: "Estrutura",
  processo: "Processo",
  outro: "Outro",
};
export const EVALUATION_STATUS_LABELS: Record<string, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  respondida: "Respondida",
};

/** Rótulo por extenso; códigos desconhecidos aparecem como vieram, nunca somem. */
export const labelOf = (labels: Record<string, string>, key: string | null | undefined) =>
  key ? (labels[key] ?? key) : "—";

/** "+3 vs. período anterior"; sem base de comparação, diz isso em vez de inventar. */
export function deltaLabel(current: number | null, previous: number | null, suffix = "") {
  if (current === null || previous === null) return "Período anterior sem dados";
  const value = current - previous;
  const shown = Number.isInteger(value) ? String(value) : decimalBR(value);
  return `${value > 0 ? "+" : ""}${shown}${suffix} vs. período anterior`;
}

/** Data de calendário (AAAA-MM-DD) sem deslocar o dia pelo fuso. */
export const formatDateBR = (value: string | null | undefined) =>
  value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const formatDateTimeBR = (value: string) => dateTime.format(new Date(value));
