import { describe, expect, it } from "vitest";
import { dbTimestamp, endOfDayBrasilia, startOfDayBrasilia, todayBrasilia } from "./timestamp";

describe("Brasília day boundaries", () => {
  it("map a calendar day to Brasília midnight regardless of the browser time zone", () => {
    expect(startOfDayBrasilia("2026-10-21")).toBe("2026-10-21T03:00:00.000Z");
    expect(endOfDayBrasilia("2026-10-21")).toBe("2026-10-22T02:59:59.999Z");
  });

  it("keeps today's date in Brasília late at night (UTC already on the next day)", () => {
    expect(todayBrasilia(new Date("2026-10-22T01:30:00Z"))).toBe("2026-10-21");
  });
});

describe("dbTimestamp", () => {
  it("accepts timestamps exactly as Postgres returns them (microseconds and offset)", () => {
    expect(dbTimestamp.safeParse("2026-10-13T03:39:12.123456+00:00").success).toBe(true);
    expect(dbTimestamp.safeParse("2026-10-13T03:39:12+00:00").success).toBe(true);
    expect(dbTimestamp.safeParse("2026-10-13T03:39:12.123Z").success).toBe(true);
  });

  it("rejects values that are not timestamps", () => {
    expect(dbTimestamp.safeParse("").success).toBe(false);
    expect(dbTimestamp.safeParse("ontem").success).toBe(false);
    expect(dbTimestamp.safeParse("2026-13-45").success).toBe(false);
  });
});
