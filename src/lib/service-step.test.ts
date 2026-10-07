import { describe, expect, it } from "vitest";
import { resolveServiceStep } from "./service-step";

describe("resolveServiceStep", () => {
  it("hides the step when the registry has no services (no attributions yet)", () => {
    expect(resolveServiceStep([])).toEqual({ show: false, autoServiceId: null });
  });

  it("records the only active service automatically", () => {
    expect(resolveServiceStep([{ id: "s1", name: "Escritura", attribution: "notas" }])).toEqual({
      show: false,
      autoServiceId: "s1",
    });
  });

  it("groups services by attribution in the legal order", () => {
    const result = resolveServiceStep([
      { id: "c1", name: "Certidão", attribution: "civil_pn" },
      { id: "n1", name: "Escritura", attribution: "notas" },
      { id: "n2", name: "Procuração", attribution: "notas" },
    ]);
    expect(result).toEqual({
      show: true,
      groups: [
        {
          attribution: "notas",
          label: "Tabelionato de Notas",
          services: [
            { id: "n1", name: "Escritura" },
            { id: "n2", name: "Procuração" },
          ],
        },
        {
          attribution: "civil_pn",
          label: "Registro Civil das Pessoas Naturais",
          services: [{ id: "c1", name: "Certidão" }],
        },
      ],
    });
  });
});
