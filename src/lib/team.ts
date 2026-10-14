import { untypedDb } from "@/lib/untyped-db";

export type TeamMember = { id: string; nome: string; ativo: boolean };

const UNKNOWN_USER = "Usuário indisponível";

/** Name lookup and responsible options built from the registry's team list. */
export function teamIndex(members: TeamMember[]) {
  const names = new Map(members.map((member) => [member.id, member.nome]));
  return {
    nameOf(id: string | null | undefined): string | null {
      if (!id) return null;
      return names.get(id) ?? UNKNOWN_USER;
    },
    active: members
      .filter((member) => member.ativo)
      .map((member) => ({ id: member.id, nome: member.nome })),
  };
}

/**
 * Names of the caller's registry team (id, name, active only). Gestor and operador cannot read
 * other rows of `usuarios` under RLS, so occurrences, plans and their history resolve names here.
 */
export async function loadTeam(supabase: unknown) {
  const { data, error } = await untypedDb(supabase).rpc("list_team_members");
  if (error) throw new Error("Não foi possível carregar a equipe.");
  return teamIndex((data ?? []) as TeamMember[]);
}
