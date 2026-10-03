import type { UserRole } from "@/types/cartoquali";

export type AppModule = "dashboard" | "evaluations" | "surveys" | "points" | "quality" | "occurrences" | "plans" | "reports" | "registry" | "users" | "settings" | "audit";
export type AppAction = "view" | "manage";

const viewByRole: Record<UserRole, readonly AppModule[]> = {
  platform_admin: ["dashboard", "evaluations", "surveys", "points", "quality", "occurrences", "plans", "reports", "registry", "users", "settings", "audit"],
  registry_admin: ["dashboard", "evaluations", "surveys", "points", "quality", "occurrences", "plans", "reports", "registry", "users", "settings", "audit"],
  manager: ["dashboard", "evaluations", "surveys", "points", "quality", "occurrences", "plans", "reports"],
  operator: ["dashboard", "evaluations", "quality", "occurrences", "plans", "reports"],
};

const manageByRole: Record<UserRole, readonly AppModule[]> = {
  platform_admin: ["surveys", "points", "occurrences", "plans", "registry", "users", "settings"],
  registry_admin: ["surveys", "points", "occurrences", "plans", "registry", "users", "settings"],
  manager: ["surveys", "points", "occurrences", "plans"],
  operator: [],
};

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: "Dashboard", evaluations: "Avaliações", surveys: "Pesquisas", points: "Pontos", quality: "Qualidade",
  occurrences: "Ocorrências", plans: "Planos de melhoria", reports: "Relatórios", registry: "Cartório",
  users: "Usuários", settings: "Configurações", audit: "Auditoria",
};

export const APP_MODULES = Object.keys(MODULE_LABELS) as AppModule[];
export function can(role: UserRole | null, module: AppModule, action: AppAction = "view") {
  if (!role) return false;
  return (action === "view" ? viewByRole : manageByRole)[role].includes(module);
}