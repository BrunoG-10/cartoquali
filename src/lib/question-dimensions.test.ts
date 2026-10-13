import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUESTION_DIMENSION,
  QUESTION_DIMENSION_KEYS,
  SELECTABLE_QUESTION_DIMENSIONS,
  questionDimensionLabel,
} from "./question-dimensions";

describe("question dimensions", () => {
  it("match the database check on perguntas.dimensao exactly", () => {
    expect([...QUESTION_DIMENSION_KEYS].sort()).toEqual(
      [
        "overall",
        "service",
        "resolution",
        "time",
        "clarity",
        "structure",
        "comment",
        "contact",
      ].sort(),
    );
    expect(QUESTION_DIMENSION_KEYS).not.toContain("general");
  });

  it("offers every dimension but contact in the form, with a valid default", () => {
    expect(SELECTABLE_QUESTION_DIMENSIONS.map((d) => d.key)).not.toContain("contact");
    expect(SELECTABLE_QUESTION_DIMENSIONS.map((d) => d.key)).toContain("overall");
    expect(QUESTION_DIMENSION_KEYS).toContain(DEFAULT_QUESTION_DIMENSION);
  });

  it("labels dimensions in Portuguese", () => {
    expect(questionDimensionLabel("overall")).toBe("Satisfação geral");
    expect(questionDimensionLabel("comment")).toBe("Comentário ou sugestão");
    expect(questionDimensionLabel("desconhecida")).toBe("");
  });
});
