import { describe, expect, it } from "vitest";
import { reportCsvFilename } from "./report-filename";

describe("reportCsvFilename", () => {
  it("uses the last included day (the period end is exclusive), in São Paulo time", () => {
    // "Este ano" 2026: 2026-01-01 00:00 BRT → 2027-01-01 00:00 BRT (exclusive)
    expect(reportCsvFilename("2026-01-01T03:00:00.000Z", "2027-01-01T03:00:00.000Z")).toBe(
      "cartoquali-relatorio-2026-01-01-a-2026-12-31.csv",
    );
  });

  it("handles a single day", () => {
    expect(reportCsvFilename("2026-10-07T03:00:00.000Z", "2026-10-08T03:00:00.000Z")).toBe(
      "cartoquali-relatorio-2026-10-07-a-2026-10-07.csv",
    );
  });
});
