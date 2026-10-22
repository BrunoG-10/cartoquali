import { describe, expect, it } from "vitest";
import { validatePassword } from "./cartoquali-validation";

describe("validatePassword", () => {
  it("accepts a password with letters and numbers", () => {
    expect(validatePassword("Cartorio2026", "ana@exemplo.com")).toBeUndefined();
    expect(validatePassword("ação2026x")).toBeUndefined();
  });

  it("rejects short, letter-only or digit-only passwords", () => {
    expect(validatePassword("abc123")).toMatch(/8 caracteres/);
    expect(validatePassword("somenteletras")).toMatch(/letras e números/);
    expect(validatePassword("1234567890123")).toMatch(/letras e números/);
  });

  it("rejects common passwords and passwords containing the e-mail name", () => {
    expect(validatePassword("Senha123")).toMatch(/muito comum/);
    expect(validatePassword("joaosilva99", "joaosilva@cartorio.com.br")).toMatch(/e-mail/);
  });
});
