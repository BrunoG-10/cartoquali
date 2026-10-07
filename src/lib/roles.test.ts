import { describe, expect, it } from "vitest";
import { primaryDbRole } from "./roles";

describe("primaryDbRole", () => {
  it("returns the most privileged role regardless of database order", () => {
    expect(primaryDbRole([{ role: "CARTORIO_ADMIN" }, { role: "PLATFORM_ADMIN" }])).toBe(
      "PLATFORM_ADMIN",
    );
    expect(primaryDbRole([{ role: "OPERADOR" }, { role: "GESTOR" }])).toBe("GESTOR");
  });

  it("returns the single role a user holds", () => {
    expect(primaryDbRole([{ role: "OPERADOR" }])).toBe("OPERADOR");
  });

  it("ignores unknown roles and handles missing data", () => {
    expect(primaryDbRole([{ role: "SUPERUSER" }])).toBeUndefined();
    expect(primaryDbRole([])).toBeUndefined();
    expect(primaryDbRole(null)).toBeUndefined();
    expect(primaryDbRole(undefined)).toBeUndefined();
  });
});
