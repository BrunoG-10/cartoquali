import { describe, expect, it } from "vitest";
import { parsePlatformOverview, registryAlert, STALE_DAYS } from "./platform-overview";

const now = new Date("2026-10-08T12:00:00Z");
const base = {
  id: "1",
  name: "Cartório A",
  city: "Goiânia",
  state: "GO",
  status: "ativo" as const,
  environmentKind: "real" as const,
  onboardingStatus: "ACTIVE",
  evaluations7d: 3,
  evaluations30d: 10,
  average30d: 4.5,
  lastEvaluationAt: "2026-10-07T12:00:00Z",
  openOccurrences: 0,
  activeUsers: 2,
  lastAccessAt: "2026-10-08T10:00:00Z",
  billing: null,
  payments: [],
};

describe("platform overview", () => {
  it("flags an active registry without evaluations for more than 7 days", () => {
    expect(STALE_DAYS).toBe(7);
    expect(registryAlert(base, now)).toBeNull();
    expect(registryAlert({ ...base, lastEvaluationAt: "2026-09-30T11:00:00Z" }, now)).toBe(
      "Sem avaliações há 8 dias",
    );
    expect(registryAlert({ ...base, lastEvaluationAt: null }, now)).toBe(
      "Nenhuma avaliação recebida",
    );
  });

  it("does not flag inactive registries or ones still in onboarding", () => {
    expect(registryAlert({ ...base, status: "inativo", lastEvaluationAt: null }, now)).toBeNull();
    expect(
      registryAlert({ ...base, onboardingStatus: "IN_PROGRESS", lastEvaluationAt: null }, now),
    ).toBeNull();
  });

  it("parses the database payload with safe defaults", () => {
    const parsed = parsePlatformOverview({
      hiddenCount: 6,
      registries: [{ ...base, average30d: "4.50", evaluations7d: "3", onboardingStatus: null }],
    });
    expect(parsed.hiddenCount).toBe(6);
    expect(parsed.registries[0]).toMatchObject({
      average30d: 4.5,
      evaluations7d: 3,
      onboardingStatus: null,
    });
    expect(parsePlatformOverview(null)).toEqual({ hiddenCount: 0, registries: [] });
  });

  it("parses billing and payments, numbers arriving as text", () => {
    const parsed = parsePlatformOverview({
      registries: [
        {
          ...base,
          billing: { monthlyFee: "299.90", dueDay: 10, startMonth: "2026-08", active: true },
          payments: [
            {
              id: "p1",
              month: "2026-08",
              amount: "299.90",
              paidOn: "2026-08-09",
              method: "pix",
              note: null,
            },
          ],
        },
      ],
    });
    expect(parsed.registries[0]?.billing).toEqual({
      monthlyFee: 299.9,
      dueDay: 10,
      startMonth: "2026-08",
      active: true,
    });
    expect(parsed.registries[0]?.payments[0]).toMatchObject({ amount: 299.9, method: "pix" });
    expect(parsePlatformOverview({ registries: [base] }).registries[0]).toMatchObject({
      billing: null,
      payments: [],
    });
  });
});
