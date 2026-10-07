// Database roles ordered from most to least privileged.
export const DB_ROLES = ["PLATFORM_ADMIN", "CARTORIO_ADMIN", "GESTOR", "OPERADOR"] as const;
export type DbRole = (typeof DB_ROLES)[number];

// A user may hold several roles; the most privileged one is the user's primary role.
export function primaryDbRole(
  roles: ReadonlyArray<{ role: string }> | null | undefined,
): DbRole | undefined {
  return DB_ROLES.find((role) => roles?.some((item) => item.role === role));
}
