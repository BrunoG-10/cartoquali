import { afterEach, describe, expect, it, vi } from "vitest";

// public-url reads VITE_PUBLIC_APP_URL once at import time, so each case reloads the module.
async function loadWith(value: string | undefined) {
  vi.resetModules();
  vi.stubEnv("VITE_PUBLIC_APP_URL", value ?? "");
  return import("./public-url");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public evaluation URL", () => {
  it("uses the configured HTTPS production origin", async () => {
    const { getEvaluationUrl } = await loadWith("https://cartoquali.com.br");
    expect(getEvaluationUrl("CQ-BAL-001")).toBe("https://cartoquali.com.br/avaliar/CQ-BAL-001");
  });

  it("drops a trailing slash from the configured origin", async () => {
    const { getPublicAppBaseUrl } = await loadWith("https://cartoquali.com.br/");
    expect(getPublicAppBaseUrl()).toBe("https://cartoquali.com.br");
  });

  it("rejects origins that would put a wrong address on printed QR codes", async () => {
    for (const bad of [
      "http://cartoquali.com.br",
      "https://cartoquali.com.br/app",
      "https://cartoquali.com.br?x=1",
      "not a url",
    ]) {
      const { getPublicAppBaseUrl } = await loadWith(bad);
      expect(getPublicAppBaseUrl()).toBe("");
    }
  });

  it("falls back to a relative path when no origin is available", async () => {
    const { getEvaluationUrl } = await loadWith(undefined);
    expect(getEvaluationUrl("CQ-BAL-001")).toBe("/avaliar/CQ-BAL-001");
  });

  it("sends invitation and recovery e-mails to the canonical password page", async () => {
    const { getPasswordSetupUrl } = await loadWith("https://cartoquali.com.br");
    expect(getPasswordSetupUrl("invite")).toBe(
      "https://cartoquali.com.br/reset-password?origem=convite",
    );
    expect(getPasswordSetupUrl("recovery")).toBe("https://cartoquali.com.br/reset-password");
  });

  it("links the onboarding form on the canonical address", async () => {
    const { getOnboardingFormUrl } = await loadWith("https://cartoquali.com.br");
    expect(getOnboardingFormUrl()).toBe("https://cartoquali.com.br/ficha-de-implantacao.pdf");
  });

  it("encodes the point code", async () => {
    const { getEvaluationUrl } = await loadWith("https://cartoquali.com.br");
    expect(getEvaluationUrl("A/B C")).toBe("https://cartoquali.com.br/avaliar/A%2FB%20C");
  });
});
