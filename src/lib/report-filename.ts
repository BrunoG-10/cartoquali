const saoPauloDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** CSV name with the first and last included days; the period end is exclusive. */
export function reportCsvFilename(currentStart: string, currentEnd: string): string {
  const first = saoPauloDate.format(new Date(currentStart));
  const last = saoPauloDate.format(new Date(new Date(currentEnd).getTime() - 1));
  return `cartoquali-relatorio-${first}-a-${last}.csv`;
}
