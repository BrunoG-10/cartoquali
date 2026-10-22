import { z } from "zod";

// Carimbo de data/hora como o Postgres devolve (ex.: 2026-10-13T03:39:12.123456+00:00), usado no
// controle de concorrência. z.string().datetime() recusa o fuso "+00:00" e quebrava a edição.
export const dbTimestamp = z
  .string()
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value)),
    "invalid_datetime",
  );

// Filtros de data seguem o horário de Brasília (sem horário de verão desde 2019), como o painel e
// a auditoria, para que um cartório em outro fuso veja os mesmos limites de dia.
const BRASILIA_OFFSET = "-03:00";

/** Início do dia (YYYY-MM-DD) em Brasília, como ISO em UTC. */
export function startOfDayBrasilia(date: string) {
  return new Date(`${date}T00:00:00.000${BRASILIA_OFFSET}`).toISOString();
}

/** Último milissegundo do dia (YYYY-MM-DD) em Brasília, como ISO em UTC. */
export function endOfDayBrasilia(date: string) {
  return new Date(`${date}T23:59:59.999${BRASILIA_OFFSET}`).toISOString();
}

/** Data de hoje (YYYY-MM-DD) em Brasília. */
export function todayBrasilia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}
