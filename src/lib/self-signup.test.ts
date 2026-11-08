import { describe, expect, it } from "vitest";
import { formatCnpj, isValidCnpj, selfSignupErrorMessage, selfSignupSchema } from "./self-signup";

const valid = {
  clientRequestId: "6f1d8a52-6c1e-4f43-9d8f-1a2b3c4d5e6f",
  submissionSession: "0b6a3f9e-2d4c-4b8a-9e1f-7c6d5e4f3a2b",
  name: "Maria Silva",
  roleTitle: "Titular",
  registryName: "Cartório do 1º Ofício",
  cnpj: "11.222.333/0001-81",
  city: "Teresina",
  state: "PI",
  attributions: ["notas"],
  whatsapp: "(86) 99999-0000",
  email: "maria@example.com",
  acceptTerms: true,
};

describe("self signup", () => {
  it("checks CNPJ check digits", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
    expect(isValidCnpj("1122233300018")).toBe(false);
  });

  it("masks the CNPJ while typing", () => {
    expect(formatCnpj("11")).toBe("11");
    expect(formatCnpj("112223")).toBe("11.222.3");
    expect(formatCnpj("11222333000181999")).toBe("11.222.333/0001-81");
  });

  it("accepts a complete form and reports each missing field", () => {
    expect(selfSignupSchema.safeParse(valid).success).toBe(true);
    const result = selfSignupSchema.safeParse({
      ...valid,
      cnpj: "11.222.333/0001-82",
      state: "",
      attributions: [],
      whatsapp: "9999-0000",
      acceptTerms: false,
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["cnpj", "state", "attributions", "whatsapp", "acceptTerms"]),
    );
  });

  it("drops malformed measurement labels instead of failing", () => {
    const parsed = selfSignupSchema.parse({ ...valid, origin: "Bad Origin!", cta: "topo" });
    expect(parsed.origin).toBeUndefined();
    expect(parsed.cta).toBe("topo");
  });

  it("explains database refusals in plain words", () => {
    expect(selfSignupErrorMessage("duplicate_registry")).toMatch(/CNPJ já tem cadastro/);
    expect(
      selfSignupErrorMessage("a user with this email address has already been registered"),
    ).toMatch(/e-mail já tem acesso/);
    expect(selfSignupErrorMessage("rate_limited")).toMatch(/Aguarde/);
    expect(selfSignupErrorMessage("boom")).toMatch(/Tente novamente/);
  });
});
