import type { UserRole } from "@/types/cartoquali";

export type AppModule =
  | "dashboard"
  | "evaluations"
  | "surveys"
  | "points"
  | "quality"
  | "occurrences"
  | "plans"
  | "reports"
  | "registry"
  | "users"
  | "settings"
  | "audit"
  | "privacy"
  | "onboarding"
  | "platform";
export type AppAction = "view" | "manage";

const viewByRole: Record<UserRole, readonly AppModule[]> = {
  platform_admin: [
    "dashboard",
    "evaluations",
    "surveys",
    "points",
    "quality",
    "occurrences",
    "plans",
    "reports",
    "registry",
    "users",
    "settings",
    "audit",
    "privacy",
    "onboarding",
    "platform",
  ],
  registry_admin: [
    "dashboard",
    "evaluations",
    "surveys",
    "points",
    "quality",
    "occurrences",
    "plans",
    "reports",
    "registry",
    "users",
    "settings",
    "audit",
    "privacy",
  ],
  manager: [
    "dashboard",
    "evaluations",
    "surveys",
    "points",
    "quality",
    "occurrences",
    "plans",
    "reports",
  ],
  operator: ["dashboard", "evaluations", "quality", "occurrences", "plans", "reports"],
};

const manageByRole: Record<UserRole, readonly AppModule[]> = {
  platform_admin: [
    "evaluations",
    "surveys",
    "points",
    "occurrences",
    "plans",
    "registry",
    "users",
    "settings",
    "privacy",
    "onboarding",
  ],
  registry_admin: [
    "evaluations",
    "surveys",
    "points",
    "occurrences",
    "plans",
    "registry",
    "users",
    "settings",
    "privacy",
  ],
  manager: ["evaluations", "surveys", "points", "occurrences", "plans"],
  operator: [],
};

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: "Dashboard",
  evaluations: "Avaliações",
  surveys: "Pesquisas",
  points: "Pontos",
  quality: "Qualidade",
  occurrences: "Ocorrências",
  plans: "Planos de melhoria",
  reports: "Relatórios",
  registry: "Cartório",
  users: "Usuários",
  settings: "Configurações",
  audit: "Auditoria",
  privacy: "Solicitações de privacidade",
  onboarding: "Implantações",
  platform: "Painel da plataforma",
};

export const APP_MODULES = Object.keys(MODULE_LABELS) as AppModule[];
export function can(role: UserRole | null, module: AppModule, action: AppAction = "view") {
  if (!role) return false;
  return (action === "view" ? viewByRole : manageByRole)[role].includes(module);
}
