import { describe, expect, it } from "vitest";
import { APP_MODULES, can } from "./permissions";

describe("permission matrix", () => {
  it("denies everything without a role", () => {
    for (const module of APP_MODULES) {
      expect(can(null, module)).toBe(false);
      expect(can(null, module, "manage")).toBe(false);
    }
  });

  it("reserves onboarding to the platform administrator", () => {
    expect(can("platform_admin", "onboarding")).toBe(true);
    expect(can("platform_admin", "onboarding", "manage")).toBe(true);
    for (const role of ["registry_admin", "manager", "operator"] as const) {
      expect(can(role, "onboarding")).toBe(false);
    }
  });

  it("lets only administrators manage users, settings and privacy", () => {
    for (const module of ["users", "settings", "privacy"] as const) {
      expect(can("platform_admin", module, "manage")).toBe(true);
      expect(can("registry_admin", module, "manage")).toBe(true);
      expect(can("manager", module, "manage")).toBe(false);
      expect(can("operator", module, "manage")).toBe(false);
    }
  });

  it("keeps the operator read-only", () => {
    for (const module of APP_MODULES) expect(can("operator", module, "manage")).toBe(false);
    expect(can("operator", "dashboard")).toBe(true);
    expect(can("operator", "users")).toBe(false);
    expect(can("operator", "audit")).toBe(false);
  });

  it("never grants manage on a module the role cannot view", () => {
    for (const role of ["platform_admin", "registry_admin", "manager", "operator"] as const) {
      for (const module of APP_MODULES) {
        if (can(role, module, "manage")) expect(can(role, module)).toBe(true);
      }
    }
  });
});
