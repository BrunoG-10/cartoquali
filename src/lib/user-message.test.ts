import { describe, expect, it } from "vitest";
import { INVALID_INPUT_MESSAGE, userMessage } from "./user-message";

describe("userMessage", () => {
  it("keeps friendly messages from the server", () => {
    expect(userMessage(new Error("Este e-mail já está em uso."), "Falhou.")).toBe(
      "Este e-mail já está em uso.",
    );
  });

  it("hides raw validation output (JSON) behind a Portuguese message", () => {
    const zod = new Error('[ { "code": "invalid_string", "path": [ "expectedUpdatedAt" ] } ]');
    expect(userMessage(zod, "Falhou.")).toBe(INVALID_INPUT_MESSAGE);
    expect(userMessage(new Error('{"message":"x"}'), "Falhou.")).toBe(INVALID_INPUT_MESSAGE);
  });

  it("falls back when there is no usable message", () => {
    expect(userMessage("texto solto", "Falhou.")).toBe("Falhou.");
    expect(userMessage(new Error(""), "Falhou.")).toBe("Falhou.");
    expect(userMessage(undefined, "Falhou.")).toBe("Falhou.");
  });
});
