import { describe, expect, it } from "vitest";
import {
  addMonths,
  billingMonths,
  billingStatus,
  billingStatusLabel,
  DUE_SOON_DAYS,
  dueDate,
  todayInSaoPaulo,
  type BillingContract,
  type BillingPayment,
} from "./billing";

const contract: BillingContract = {
  monthlyFee: 300,
  dueDay: 10,
  startMonth: "2026-08",
  active: true,
};
const paid = (month: string): BillingPayment => ({
  id: month,
  month,
  amount: 300,
  paidOn: `${month}-09`,
  method: "pix",
  note: null,
});

describe("billing helpers", () => {
  it("builds due dates and walks months", () => {
    expect(dueDate("2026-10", 10)).toBe("2026-10-10");
    expect(dueDate("2026-02", 5)).toBe("2026-02-05");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("reads today in São Paulo, not UTC", () => {
    // 01:00 UTC on Oct 9 is still Oct 8 in São Paulo (UTC-3).
    expect(todayInSaoPaulo(new Date("2026-10-09T01:00:00Z"))).toBe("2026-10-08");
  });
});

describe("billingStatus", () => {
  it("is 'none' without an active contract", () => {
    expect(billingStatus(null, [], "2026-10-08").kind).toBe("none");
    expect(billingStatus({ ...contract, active: false }, [], "2026-10-08").kind).toBe("none");
  });

  it("is up to date when every past due month is paid", () => {
    const status = billingStatus(
      contract,
      [paid("2026-08"), paid("2026-09"), paid("2026-10")],
      "2026-10-20",
    );
    expect(status).toMatchObject({ kind: "ok", nextDue: "2026-11-10", amountDue: 0 });
  });

  it("warns when the next due date is within 5 days", () => {
    expect(DUE_SOON_DAYS).toBe(5);
    const status = billingStatus(contract, [paid("2026-08"), paid("2026-09")], "2026-10-06");
    expect(status).toMatchObject({ kind: "due_soon", nextDue: "2026-10-10", daysUntilDue: 4 });
    // the due day itself is not late yet
    expect(billingStatus(contract, [paid("2026-08"), paid("2026-09")], "2026-10-10").kind).toBe(
      "due_soon",
    );
  });

  it("is overdue the day after the due date, counting from the oldest open month", () => {
    const status = billingStatus(contract, [paid("2026-08")], "2026-10-12");
    expect(status).toMatchObject({
      kind: "overdue",
      overdueMonths: ["2026-09", "2026-10"],
      amountDue: 600,
      daysLate: 32,
      nextDue: "2026-09-10",
    });
  });

  it("does not charge months before the start", () => {
    const status = billingStatus({ ...contract, startMonth: "2026-11" }, [], "2026-10-20");
    expect(status).toMatchObject({ kind: "ok", nextDue: "2026-11-10", amountDue: 0 });
  });
});

describe("billingStatusLabel", () => {
  it("describes each situation in plain Portuguese", () => {
    expect(billingStatusLabel({ kind: "none" })).toBe("Sem cobrança");
    expect(
      billingStatusLabel({ kind: "ok", nextDue: "2026-11-10", daysUntilDue: 20, amountDue: 0 }),
    ).toBe("Em dia");
    expect(
      billingStatusLabel({
        kind: "due_soon",
        nextDue: "2026-10-10",
        daysUntilDue: 0,
        amountDue: 0,
      }),
    ).toBe("Vence hoje");
    expect(
      billingStatusLabel({
        kind: "due_soon",
        nextDue: "2026-10-11",
        daysUntilDue: 1,
        amountDue: 0,
      }),
    ).toBe("Vence em 1 dia");
    expect(
      billingStatusLabel({
        kind: "overdue",
        nextDue: "2026-09-10",
        daysLate: 32,
        overdueMonths: ["2026-09", "2026-10"],
        amountDue: 600,
      }),
    ).toBe("Atrasado há 32 dias");
  });
});

describe("billingMonths", () => {
  it("lists up to 12 months from the start to the current month, newest first", () => {
    const months = billingMonths(contract, [paid("2026-09")], "2026-10-20");
    expect(months.map((m) => [m.month, m.state])).toEqual([
      ["2026-10", "overdue"],
      ["2026-09", "paid"],
      ["2026-08", "overdue"],
    ]);
    expect(billingMonths({ ...contract, startMonth: "2025-01" }, [], "2026-10-08")).toHaveLength(
      12,
    );
    expect(billingMonths(contract, [], "2026-10-05")[0]).toMatchObject({
      month: "2026-10",
      state: "open",
    });
  });
});
