import { z } from "zod";

// Carimbo de data/hora como o Postgres devolve (ex.: 2026-10-13T03:39:12.123456+00:00), usado no
// controle de concorrência. z.string().datetime() recusa o fuso "+00:00" e quebrava a edição.
export const dbTimestamp = z
  .string()
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value)),
    "invalid_datetime",
  );
