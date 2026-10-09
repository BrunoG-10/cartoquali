// Cobrança mensal dos cartórios (painel da plataforma). Meses são "AAAA-MM" e datas "AAAA-MM-DD",
// sempre no fuso de São Paulo; a situação é calculada aqui a partir do contrato e dos pagamentos.

export type BillingContract = {
  monthlyFee: number;
  /** Dia do vencimento, de 1 a 28 (existe em todos os meses). */
  dueDay: number;
  /** Primeiro mês cobrado, "AAAA-MM". */
  startMonth: string;
  active: boolean;
};

export type PaymentMethod = "pix" | "boleto" | "transferencia" | "outro";

export type BillingPayment = {
  id: string;
  month: string;
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  note: string | null;
};

export type BillingStatus =
  | { kind: "none" }
  | { kind: "ok" | "due_soon"; nextDue: string; daysUntilDue: number; amountDue: 0 }
  | {
      kind: "overdue";
      nextDue: string;
      daysLate: number;
      overdueMonths: string[];
      amountDue: number;
    };

export type BillingMonth = {
  month: string;
  dueDate: string;
  state: "paid" | "open" | "overdue";
  payment: BillingPayment | null;
};

export const DUE_SOON_DAYS = 5;
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  transferencia: "Transferência",
  outro: "Outro",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (value: number) => String(value).padStart(2, "0");

export function addMonths(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export const dueDate = (month: string, dueDay: number) => `${month}-${pad(dueDay)}`;

/** Diferença em dias entre duas datas "AAAA-MM-DD" (b - a). */
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

export function todayInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function billingStatus(
  contract: BillingContract | null,
  payments: BillingPayment[],
  today: string,
): BillingStatus {
  if (!contract || !contract.active) return { kind: "none" };
  const paidMonths = new Set(payments.map((payment) => payment.month));
  const currentMonth = today.slice(0, 7);

  const overdueMonths: string[] = [];
  for (let month = contract.startMonth; month <= currentMonth; month = addMonths(month, 1)) {
    if (!paidMonths.has(month) && dueDate(month, contract.dueDay) < today)
      overdueMonths.push(month);
  }
  const [oldestMonth] = overdueMonths;
  if (oldestMonth) {
    const oldest = dueDate(oldestMonth, contract.dueDay);
    return {
      kind: "overdue",
      nextDue: oldest,
      daysLate: daysBetween(oldest, today),
      overdueMonths,
      amountDue: overdueMonths.length * contract.monthlyFee,
    };
  }

  // Primeiro mês em aberto a partir do início (no máximo um mês após o atual).
  let month = contract.startMonth > currentMonth ? contract.startMonth : currentMonth;
  if (paidMonths.has(month)) month = addMonths(month, 1);
  while (paidMonths.has(month)) month = addMonths(month, 1);
  const nextDue = dueDate(month, contract.dueDay);
  const daysUntilDue = daysBetween(today, nextDue);
  return {
    kind: daysUntilDue <= DUE_SOON_DAYS ? "due_soon" : "ok",
    nextDue,
    daysUntilDue,
    amountDue: 0,
  };
}

const days = (n: number) => `${n} dia${n === 1 ? "" : "s"}`;

export function billingStatusLabel(status: BillingStatus): string {
  if (status.kind === "none") return "Sem cobrança";
  if (status.kind === "overdue") return `Atrasado há ${days(status.daysLate)}`;
  if (status.kind === "due_soon")
    return status.daysUntilDue === 0 ? "Vence hoje" : `Vence em ${days(status.daysUntilDue)}`;
  return "Em dia";
}

/** Últimos 12 meses cobrados (do início até o mês atual), do mais recente ao mais antigo. */
export function billingMonths(
  contract: BillingContract,
  payments: BillingPayment[],
  today: string,
): BillingMonth[] {
  const byMonth = new Map(payments.map((payment) => [payment.month, payment]));
  const currentMonth = today.slice(0, 7);
  const months: BillingMonth[] = [];
  for (
    let month = currentMonth;
    month >= contract.startMonth && months.length < 12;
    month = addMonths(month, -1)
  ) {
    const due = dueDate(month, contract.dueDay);
    const payment = byMonth.get(month) ?? null;
    months.push({
      month,
      dueDate: due,
      payment,
      state: payment ? "paid" : due < today ? "overdue" : "open",
    });
  }
  return months;
}
