import { describe, expect, it } from "vitest";
import {
  CATEGORY_LABELS,
  OCCURRENCE_STATUS_LABELS,
  deltaLabel,
  formatDateBR,
  formatDateTimeBR,
  labelOf,
} from "./report-format";

describe("deltaLabel", () => {
  it("shows the signed difference against the previous period", () => {
    expect(deltaLabel(7, 4)).toBe("+3 vs. período anterior");
    expect(deltaLabel(2, 5)).toBe("-3 vs. período anterior");
    expect(deltaLabel(3, 3)).toBe("0 vs. período anterior");
    expect(deltaLabel(57.14, 50, " p.p.")).toBe("+7,1 p.p. vs. período anterior");
  });
  it("says when there is nothing to compare", () => {
    expect(deltaLabel(5, null)).toBe("Período anterior sem dados");
    expect(deltaLabel(null, 5)).toBe("Período anterior sem dados");
  });
});

describe("labels", () => {
  it("spells codes out and keeps unknown ones visible", () => {
    expect(labelOf(OCCURRENCE_STATUS_LABELS, "em_tratamento")).toBe("Em tratamento");
    expect(labelOf(CATEGORY_LABELS, "tempo")).toBe("Tempo");
    expect(labelOf(CATEGORY_LABELS, "novo_codigo")).toBe("novo_codigo");
    expect(labelOf(CATEGORY_LABELS, null)).toBe("—");
  });
});

describe("dates", () => {
  it("keeps calendar dates on the same day", () => {
    expect(formatDateBR("2026-10-20")).toBe("20/10/2026");
    expect(formatDateBR(null)).toBe("—");
  });
  it("shows times in São Paulo", () => {
    expect(formatDateTimeBR("2026-10-13T03:37:00Z")).toBe("13/10/2026, 00:37");
  });
});
