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
