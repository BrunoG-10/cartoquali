import { describe, expect, it } from "vitest";
import { accessLabel, resendKind } from "./user-access";

describe("accessLabel", () => {
  it("tells whether the person already signed in", () => {
    expect(accessLabel({ hasAuth: false, lastSignInAt: null })).toBe("Convite não enviado");
    expect(accessLabel({ hasAuth: true, lastSignInAt: null })).toBe("Aguardando primeiro acesso");
    expect(accessLabel({ hasAuth: true, lastSignInAt: "2026-10-13T03:30:00Z" })).toBe(
      "Último acesso em 13/10/2026 00:30",
    );
  });
});

describe("resendKind", () => {
  it("re-sends the invite until the first sign-in, then a password link", () => {
    expect(resendKind({ lastSignInAt: null, confirmedAt: null })).toBe("invite");
    expect(resendKind({ lastSignInAt: null, confirmedAt: "2026-10-13T03:00:00Z" })).toBe(
      "recovery",
    );
    expect(resendKind({ lastSignInAt: "2026-10-13T03:30:00Z", confirmedAt: "x" })).toBe("recovery");
  });
});
