// CSV das avaliações do relatório, pronto para o Excel em português: BOM (acentos), ponto e
// vírgula, data/hora de São Paulo e situação por extenso. Textos vindos do público são
// neutralizados para não virarem fórmula na planilha (injeção de CSV).

import { EVALUATION_STATUS_LABELS } from "@/lib/report-format";

export type CsvEvaluation = {
  created_at: string;
  service_name?: string | null;
  point_name: string;
  survey_name: string;
  rating: number;
  status: string;
  comment: string | null;
};

const STATUS_LABELS = EVALUATION_STATUS_LABELS;

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const formatDate = (iso: string) => dateTime.format(new Date(iso)).replace(", ", " ");

export function buildEvaluationsCsv(rows: CsvEvaluation[]): string {
  const header = ["Data", "Serviço", "Ponto", "Pesquisa", "Nota", "Situação", "Comentário"];
  const lines = rows.map((item) => [
    formatDate(item.created_at),
    item.service_name ?? "",
    item.point_name,
    item.survey_name,
    String(item.rating),
    STATUS_LABELS[item.status] ?? item.status,
    item.comment ?? "",
  ]);
  return `﻿${[header, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
}
