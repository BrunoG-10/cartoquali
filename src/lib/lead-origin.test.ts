import { describe, expect, it } from "vitest";
import { leadOriginFromSearch } from "./lead-origin";

describe("leadOriginFromSearch", () => {
  it("usa ?origem= quando existe", () => {
    expect(leadOriginFromSearch("?origem=whatsapp-pi")).toBe("whatsapp-pi");
  });

  it("junta utm_source e utm_campaign", () => {
    expect(leadOriginFromSearch("?utm_source=instagram&utm_campaign=lancamento")).toBe(
      "instagram-lancamento",
    );
  });

  it("normaliza acentos, espaços e maiúsculas", () => {
    expect(leadOriginFromSearch("?origem=E-mail%20Cart%C3%B3rios%20SP")).toBe(
      "e-mail-cartorios-sp",
    );
  });

  it("descarta origem vazia ou só com símbolos", () => {
    expect(leadOriginFromSearch("")).toBeUndefined();
    expect(leadOriginFromSearch("?origem=%%%")).toBeUndefined();
  });

  it("limita o tamanho a 80 caracteres", () => {
    expect(leadOriginFromSearch(`?origem=${"a".repeat(120)}`)).toHaveLength(80);
  });
});
