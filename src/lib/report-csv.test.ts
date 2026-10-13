import { describe, expect, it } from "vitest";
import { buildEvaluationsCsv, csvCell } from "./report-csv";

const row = {
  created_at: "2026-10-13T03:37:02.136319+00:00",
  service_name: "Escritura",
  point_name: "Atendimento principal",
  survey_name: "Pesquisa de satisfação",
  rating: 1,
  status: "respondida",
  comment: 'Demorou; "muito"',
};

describe("buildEvaluationsCsv", () => {
  it("uses a BOM, Portuguese headers and semicolons (Excel in pt-BR)", () => {
    const csv = buildEvaluationsCsv([row]);
    expect(csv.startsWith("﻿")).toBe(true);
    const [header, line] = csv.slice(1).split("\r\n");
    expect(header).toBe('"Data";"Serviço";"Ponto";"Pesquisa";"Nota";"Situação";"Comentário"');
    expect(line).toBe(
      '"13/10/2026 00:37";"Escritura";"Atendimento principal";"Pesquisa de satisfação";"1";"Respondida";"Demorou; ""muito"""',
    );
  });

  it("writes date and time in São Paulo time", () => {
    const csv = buildEvaluationsCsv([{ ...row, created_at: "2026-01-01T02:30:00+00:00" }]);
    expect(csv).toContain('"31/12/2025 23:30"');
  });

  it("fills missing service and comment with blanks", () => {
    const csv = buildEvaluationsCsv([{ ...row, service_name: null, comment: null }]);
    expect(csv.split("\r\n")[1]).toContain(' 00:37";"";"Atendimento');
    expect(csv.split("\r\n")[1]?.endsWith('"Respondida";""')).toBe(true);
  });
});

describe("csvCell", () => {
  it("neutralizes spreadsheet formulas (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell("-2")).toBe(`"'-2"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
    expect(csvCell(5)).toBe('"5"');
    expect(csvCell(null)).toBe('""');
  });
});
