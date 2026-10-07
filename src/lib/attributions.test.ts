import { describe, expect, it } from "vitest";
import {
  ATTRIBUTIONS,
  ESSENTIAL_LABELS,
  ESSENTIAL_QUESTIONS,
  SERVICE_CATALOG,
} from "./attributions";

describe("attributions catalog", () => {
  it("lists the seven specialties of Lei 8.935/1994, art. 5, in order", () => {
    expect(ATTRIBUTIONS.map((item) => item.key)).toEqual([
      "notas",
      "protesto",
      "imoveis",
      "rtd_pj",
      "civil_pn",
      "maritimo",
      "distribuicao",
    ]);
    expect(ATTRIBUTIONS[0]?.label).toBe("Tabelionato de Notas");
    expect(ATTRIBUTIONS[4]?.label).toBe("Registro Civil das Pessoas Naturais");
  });

  it("gives every attribution at least one suggested service", () => {
    for (const { key } of ATTRIBUTIONS) {
      expect(
        SERVICE_CATALOG.filter((service) => service.attribution === key).length,
      ).toBeGreaterThan(0);
    }
  });

  it("uses unique catalog keys prefixed by the attribution", () => {
    const keys = SERVICE_CATALOG.map((service) => service.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const service of SERVICE_CATALOG)
      expect(service.key.startsWith(`${service.attribution}.`)).toBe(true);
  });

  it("includes the notary services from the spec", () => {
    expect(
      SERVICE_CATALOG.filter((service) => service.attribution === "notas").map(
        (service) => service.name,
      ),
    ).toEqual([
      "Reconhecimento de firma",
      "Autenticação de cópias",
      "Escritura",
      "Procuração",
      "Testamento",
      "Ata notarial",
      "Inventário ou divórcio em cartório",
    ]);
  });
});

describe("essential questions", () => {
  it("has six questions in order 1 to 6", () => {
    expect(ESSENTIAL_QUESTIONS.map((question) => question.key)).toEqual([
      "overall",
      "courtesy",
      "clarity",
      "time",
      "structure",
      "resolution",
    ]);
    expect(ESSENTIAL_QUESTIONS.map((question) => question.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("only makes the facilities question optional", () => {
    expect(
      ESSENTIAL_QUESTIONS.filter((question) => !question.required).map((question) => question.key),
    ).toEqual(["structure"]);
  });

  it("uses stars for overall, yes/no for resolution and the service dimension for courtesy", () => {
    const find = (key: string) => ESSENTIAL_QUESTIONS.find((question) => question.key === key);
    expect(find("overall")?.type).toBe("stars");
    expect(find("resolution")?.type).toBe("yes_no");
    expect(find("courtesy")?.dimension).toBe("service");
    expect(find("overall")?.text).toBe("Como você avalia sua experiência geral hoje?");
  });

  it("labels each essential indicator", () => {
    expect(ESSENTIAL_LABELS.courtesy).toBe("Cordialidade");
    expect(ESSENTIAL_LABELS.structure).toBe("Instalações");
  });
});
