import { describe, expect, it } from "vitest";
import { decimalBR, formatPhoneBR, percentBR, plural } from "./format";

describe("number formatting (pt-BR)", () => {
  it("uses a decimal comma with one digit", () => {
    expect(decimalBR(3)).toBe("3,0");
    expect(decimalBR(4.25)).toBe("4,3");
    expect(percentBR(33.333)).toBe("33,3%");
    expect(percentBR(0)).toBe("0,0%");
  });
});

describe("plural", () => {
  it("agrees with the count", () => {
    expect(plural(1, "ocorrência", "ocorrências")).toBe("1 ocorrência");
    expect(plural(0, "ocorrência", "ocorrências")).toBe("0 ocorrências");
    expect(plural(2, "estrela", "estrelas")).toBe("2 estrelas");
  });
});

describe("formatPhoneBR", () => {
  it("formats Brazilian mobile and landline numbers", () => {
    expect(formatPhoneBR("86999999999")).toBe("(86) 99999-9999");
    expect(formatPhoneBR("8632220000")).toBe("(86) 3222-0000");
    expect(formatPhoneBR("(86) 3222-0000")).toBe("(86) 3222-0000");
  });
  it("keeps anything else as typed", () => {
    expect(formatPhoneBR("+55 86 99999-9999")).toBe("+55 86 99999-9999");
    expect(formatPhoneBR("123")).toBe("123");
    expect(formatPhoneBR(null)).toBe("");
  });
});
