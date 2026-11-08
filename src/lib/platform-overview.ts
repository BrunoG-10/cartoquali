// Painel da plataforma: formato dos dados de get_platform_overview e o alerta de cartório parado.
import type { BillingContract, BillingPayment, PaymentMethod } from "@/lib/billing";

export type PlatformRegistry = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: "ativo" | "inativo";
  environmentKind: "real" | "demo";
  onboardingStatus: string | null;
  /** "cadastro_proprio" quando o próprio cartório se cadastrou pela página comercial. */
  origin: "plataforma" | "cadastro_proprio";
  selfSignup: SelfSignupContact | null;
  trial: RegistryTrial | null;
  evaluations7d: number;
  evaluations30d: number;
  average30d: number | null;
  lastEvaluationAt: string | null;
  openOccurrences: number;
  activeUsers: number;
  lastAccessAt: string | null;
  billing: BillingContract | null;
  payments: BillingPayment[];
};

export type SelfSignupContact = {
  createdAt: string;
  name: string;
  role: string;
  whatsapp: string;
  email: string;
};

/** Período de teste de 7 dias; startedAt nulo enquanto ninguém do cartório entrou. */
export type RegistryTrial = { startedAt: string | null; endsAt: string | null; expired: boolean };

export type PlatformOverview = { hiddenCount: number; registries: PlatformRegistry[] };

/** Dias sem avaliação a partir dos quais um cartório ativo recebe alerta. */
export const STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (value: unknown) => (value == null || value === "" ? null : Number(value));
const toText = (value: unknown) => (value == null ? null : String(value));

export function parsePlatformOverview(payload: unknown): PlatformOverview {
  const raw = (payload ?? {}) as { hiddenCount?: unknown; registries?: unknown };
  const rows = Array.isArray(raw.registries)
    ? (raw.registries as Partial<Record<keyof PlatformRegistry, unknown>>[])
    : [];
  return {
    hiddenCount: toNumber(raw.hiddenCount) ?? 0,
    registries: rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      city: String(row.city ?? ""),
      state: String(row.state ?? ""),
      status: row.status === "inativo" ? "inativo" : "ativo",
      environmentKind: row.environmentKind === "demo" ? "demo" : "real",
      onboardingStatus: toText(row.onboardingStatus),
      origin: row.origin === "cadastro_proprio" ? "cadastro_proprio" : "plataforma",
      selfSignup: parseSelfSignup(row.selfSignup),
      trial: parseTrial(row.trial),
      evaluations7d: toNumber(row.evaluations7d) ?? 0,
      evaluations30d: toNumber(row.evaluations30d) ?? 0,
      average30d: toNumber(row.average30d),
      lastEvaluationAt: toText(row.lastEvaluationAt),
      openOccurrences: toNumber(row.openOccurrences) ?? 0,
      activeUsers: toNumber(row.activeUsers) ?? 0,
      lastAccessAt: toText(row.lastAccessAt),
      billing: parseBilling(row.billing),
      payments: Array.isArray(row.payments) ? row.payments.map(parsePayment) : [],
    })),
  };
}

function parseSelfSignup(value: unknown): SelfSignupContact | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Record<keyof SelfSignupContact, unknown>>;
  return {
    createdAt: String(raw.createdAt ?? ""),
    name: String(raw.name ?? ""),
    role: String(raw.role ?? ""),
    whatsapp: String(raw.whatsapp ?? ""),
    email: String(raw.email ?? ""),
  };
}

function parseTrial(value: unknown): RegistryTrial | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Record<keyof RegistryTrial, unknown>>;
  return {
    startedAt: toText(raw.startedAt),
    endsAt: toText(raw.endsAt),
    expired: raw.expired === true,
  };
}

const METHODS: PaymentMethod[] = ["pix", "boleto", "transferencia", "outro"];

function parseBilling(value: unknown): BillingContract | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Record<keyof BillingContract, unknown>>;
  return {
    monthlyFee: toNumber(raw.monthlyFee) ?? 0,
    dueDay: toNumber(raw.dueDay) ?? 1,
    startMonth: String(raw.startMonth ?? ""),
    active: raw.active !== false,
  };
}

function parsePayment(value: unknown): BillingPayment {
  const raw = (value ?? {}) as Partial<Record<keyof BillingPayment, unknown>>;
  const method = METHODS.find((item) => item === raw.method) ?? "outro";
  return {
    id: String(raw.id),
    month: String(raw.month ?? ""),
    amount: toNumber(raw.amount) ?? 0,
    paidOn: String(raw.paidOn ?? ""),
    method,
    note: toText(raw.note),
  };
}

/** Cartório ativo (implantação concluída ou sem implantação registrada) parado há mais de 7 dias. */
export function registryAlert(registry: PlatformRegistry, now = new Date()): string | null {
  if (registry.status !== "ativo") return null;
  if (registry.onboardingStatus && registry.onboardingStatus !== "ACTIVE") return null;
  if (!registry.lastEvaluationAt) return "Nenhuma avaliação recebida";
  const days = Math.floor((now.getTime() - new Date(registry.lastEvaluationAt).getTime()) / DAY_MS);
  return days > STALE_DAYS ? `Sem avaliações há ${days} dias` : null;
}

export type TrialSituation =
  | { kind: "none" }
  | { kind: "not_started" }
  | { kind: "running"; daysLeft: number; endsAt: string }
  | { kind: "expired"; endsAt: string };

/**
 * Situação do teste de 7 dias para o painel. Com cobrança ativa o teste deixa de importar
 * (o acesso segue liberado), igual a cartoquali_private.registry_trial_expired.
 */
export function trialSituation(registry: PlatformRegistry, now = new Date()): TrialSituation {
  const trial = registry.trial;
  if (!trial || registry.billing?.active) return { kind: "none" };
  if (!trial.startedAt || !trial.endsAt) return { kind: "not_started" };
  const left = new Date(trial.endsAt).getTime() - now.getTime();
  if (trial.expired || left <= 0) return { kind: "expired", endsAt: trial.endsAt };
  return { kind: "running", daysLeft: Math.ceil(left / DAY_MS), endsAt: trial.endsAt };
}
