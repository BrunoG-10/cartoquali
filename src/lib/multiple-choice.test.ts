import { describe, expect, it } from "vitest";
import {
  choiceAnswer,
  choiceOther,
  choiceValues,
  describeAnswer,
  isNothingOption,
  isOtherOption,
  toggleChoice,
} from "./multiple-choice";

describe("multiple choice helpers", () => {
  it("recognizes the special options regardless of case or detail", () => {
    expect(isOtherOption("Outro")).toBe(true);
    expect(isOtherOption("outro motivo")).toBe(true);
    expect(isOtherOption("Outros cartórios")).toBe(false);
    expect(isNothingOption("Nada a melhorar")).toBe(true);
    expect(isNothingOption("nada a melhorar, tudo ótimo")).toBe(true);
  });

  it("makes 'Nada a melhorar' exclusive", () => {
    expect(toggleChoice(["Tempo de espera", "Outro"], "Nada a melhorar")).toEqual([
      "Nada a melhorar",
    ]);
    expect(toggleChoice(["Nada a melhorar"], "Tempo de espera")).toEqual(["Tempo de espera"]);
    expect(toggleChoice(["Tempo de espera"], "Tempo de espera")).toEqual([]);
    expect(toggleChoice(["Tempo de espera"], "Clareza das informações")).toEqual([
      "Tempo de espera",
      "Clareza das informações",
    ]);
  });

  it("reads values and the free text from either answer shape", () => {
    expect(choiceValues(["A"])).toEqual(["A"]);
    expect(choiceValues({ values: ["Outro"], other: "x" })).toEqual(["Outro"]);
    expect(choiceValues(undefined)).toEqual([]);
    expect(choiceOther({ values: ["Outro"], other: "Fila" })).toBe("Fila");
    expect(choiceOther(["Outro"])).toBe("");
  });

  it("describes a stored answer with the 'Outro' text in place", () => {
    expect(describeAnswer(["Tempo de espera", "Outro"], "Fila sem senha")).toBe(
      "Tempo de espera · Outro: Fila sem senha",
    );
    expect(describeAnswer(["Clareza das informações"], null)).toBe("Clareza das informações");
    expect(describeAnswer(["Comentário livre"], "Comentário livre")).toBe("Comentário livre");
    expect(describeAnswer([], null)).toBe("Sem resposta");
  });

  it("only keeps the free text while 'Outro' is selected", () => {
    // Kept as typed (spaces between words survive each keystroke); the server trims it.
    expect(choiceAnswer(["Outro"], "Falta de ")).toEqual({
      values: ["Outro"],
      other: "Falta de ",
    });
    expect(choiceAnswer(["Outro"], "   ")).toEqual(["Outro"]);
    expect(choiceAnswer(["Tempo de espera"], "texto esquecido")).toEqual(["Tempo de espera"]);
  });
});
