import { describe, expect, it } from "vitest";
import { pickMainPoint } from "./main-point";

const point = (id: string, status: "Ativo" | "Inativo", createdAt: string) => ({
  id,
  status,
  createdAt,
});

describe("pickMainPoint (QR Code único)", () => {
  it("returns undefined without points", () => {
    expect(pickMainPoint([])).toBeUndefined();
  });
  it("prefers the oldest active point", () => {
    const points = [
      point("b", "Ativo", "2026-02-01T00:00:00Z"),
      point("a", "Inativo", "2026-01-01T00:00:00Z"),
      point("c", "Ativo", "2026-03-01T00:00:00Z"),
    ];
    expect(pickMainPoint(points)?.id).toBe("b");
  });
  it("falls back to the oldest point when none is active", () => {
    const points = [
      point("b", "Inativo", "2026-02-01T00:00:00Z"),
      point("a", "Inativo", "2026-01-01T00:00:00Z"),
    ];
    expect(pickMainPoint(points)?.id).toBe("a");
  });
});
