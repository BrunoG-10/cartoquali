import { describe, expect, it } from "vitest";
import { decimalBR, formatPhoneBR, moneyInputBR, parseMoneyBR, percentBR, plural } from "./format";

describe("parseMoneyBR", () => {
  it("reads values the way they are typed in Brazil", () => {
    expect(parseMoneyBR("199,90")).toBe(199.9);
    expect(parseMoneyBR("1.500")).toBe(1500);
    expect(parseMoneyBR("1.500,00")).toBe(1500);
    expect(parseMoneyBR("12.345.678,9")).toBe(12345678.9);
    expect(parseMoneyBR("R$ 300")).toBe(300);
    expect(parseMoneyBR(" 300,5 ")).toBe(300.5);
  });

  it("still accepts a decimal point that is not a thousands separator", () => {
    expect(parseMoneyBR("199.9")).toBe(199.9);
    expect(parseMoneyBR("199.90")).toBe(199.9);
  });

  it("rejects text that is not a value", () => {
    expect(parseMoneyBR("")).toBeNaN();
    expect(parseMoneyBR("abc")).toBeNaN();
    expect(parseMoneyBR("1,2,3")).toBeNaN();
  });
});

describe("moneyInputBR", () => {
  it("fills an input with a decimal comma and two digits", () => {
    expect(moneyInputBR(199.9)).toBe("199,90");
    expect(moneyInputBR(1500)).toBe("1500,00");
    expect(parseMoneyBR(moneyInputBR(1234.5))).toBe(1234.5);
  });
});

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
