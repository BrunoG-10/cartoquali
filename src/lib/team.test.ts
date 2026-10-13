import { describe, expect, it } from "vitest";
import { teamIndex } from "./team";

const members = [
  { id: "a", nome: "Administração Piloto", ativo: true },
  { id: "g", nome: "Gestor Piloto", ativo: true },
  { id: "x", nome: "Ex-colaborador", ativo: false },
];

describe("teamIndex", () => {
  it("resolves every colleague's name, including inactive ones (history keeps their name)", () => {
    const team = teamIndex(members);
    expect(team.nameOf("a")).toBe("Administração Piloto");
    expect(team.nameOf("x")).toBe("Ex-colaborador");
  });

  it("returns null for an empty id and a fallback for an unknown one", () => {
    const team = teamIndex(members);
    expect(team.nameOf(null)).toBeNull();
    expect(team.nameOf(undefined)).toBeNull();
    expect(team.nameOf("zzz")).toBe("Usuário indisponível");
  });

  it("offers only active colleagues as responsible, with id and name only", () => {
    expect(teamIndex(members).active).toEqual([
      { id: "a", nome: "Administração Piloto" },
      { id: "g", nome: "Gestor Piloto" },
    ]);
  });

  it("handles an empty team", () => {
    const team = teamIndex([]);
    expect(team.active).toEqual([]);
    expect(team.nameOf("a")).toBe("Usuário indisponível");
  });
});
