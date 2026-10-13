import { describe, expect, it } from "vitest";
import { APP_MODULES, can, moduleForPath } from "./permissions";

describe("moduleForPath", () => {
  it("maps each internal page to the module that guards it", () => {
    expect(moduleForPath("/usuarios")).toBe("users");
    expect(moduleForPath("/auditoria")).toBe("audit");
    expect(moduleForPath("/cartorio")).toBe("registry");
    expect(moduleForPath("/configuracoes")).toBe("settings");
    expect(moduleForPath("/solicitacoes-privacidade")).toBe("privacy");
    expect(moduleForPath("/pesquisas")).toBe("surveys");
    expect(moduleForPath("/pontos")).toBe("points");
    expect(moduleForPath("/plataforma")).toBe("platform");
    expect(moduleForPath("/implantacoes")).toBe("onboarding");
    expect(moduleForPath("/visao-executiva")).toBe("reports");
  });

  it("covers nested paths and trailing slashes", () => {
    expect(moduleForPath("/relatorios/satisfacao")).toBe("reports");
    expect(moduleForPath("/usuarios/")).toBe("users");
  });

  it("does not confuse pages that share a prefix", () => {
    expect(moduleForPath("/pontos-extra")).toBeUndefined();
  });

  it("leaves unknown pages unguarded", () => {
    expect(moduleForPath("/")).toBeUndefined();
    expect(moduleForPath("/avaliar")).toBeUndefined();
  });

  it("blocks the manager and operator from administrative pages", () => {
    for (const path of [
      "/usuarios",
      "/auditoria",
      "/cartorio",
      "/configuracoes",
      "/solicitacoes-privacidade",
    ]) {
      expect(can("manager", moduleForPath(path)!)).toBe(false);
      expect(can("operator", moduleForPath(path)!)).toBe(false);
    }
    expect(can("operator", moduleForPath("/pesquisas")!)).toBe(false);
    expect(can("manager", moduleForPath("/pesquisas")!)).toBe(true);
  });
});

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

  it("shows the platform panel only to the platform administrator", () => {
    expect(can("platform_admin", "platform")).toBe(true);
    for (const role of ["registry_admin", "manager", "operator"] as const) {
      expect(can(role, "platform")).toBe(false);
    }
  });

  it("lets administrators and managers update an evaluation's status, not operators", () => {
    expect(can("platform_admin", "evaluations", "manage")).toBe(true);
    expect(can("registry_admin", "evaluations", "manage")).toBe(true);
    expect(can("manager", "evaluations", "manage")).toBe(true);
    expect(can("operator", "evaluations", "manage")).toBe(false);
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
