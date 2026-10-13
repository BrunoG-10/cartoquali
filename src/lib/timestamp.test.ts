import { describe, expect, it } from "vitest";
import { dbTimestamp } from "./timestamp";

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
