import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./primitives";
import {
  billingMonths,
  billingStatus,
  billingStatusLabel,
  PAYMENT_METHOD_LABELS,
  todayInSaoPaulo,
  type BillingMonth,
  type PaymentMethod,
} from "@/lib/billing";
import {
  registerRegistryPayment,
  removeRegistryPayment,
  saveRegistryBilling,
} from "@/lib/platform.functions";
import type { PlatformRegistry } from "@/lib/platform-overview";

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const shortDate = (iso: string) => iso.split("-").reverse().join("/");
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const monthLabel = (month: string) =>
  `${MONTHS[Number(month.slice(5, 7)) - 1]}/${month.slice(0, 4)}`;

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BillingDialog({
  registry,
  open,
  onOpenChange,
  onChanged,
}: {
  registry: PlatformRegistry | undefined;
  open: boolean;
  onOpenChange(open: boolean): void;
  onChanged(): Promise<unknown>;
}) {
  const save = useServerFn(saveRegistryBilling);
  const today = todayInSaoPaulo();
  const [form, setForm] = useState({
    fee: "",
    dueDay: "10",
    start: today.slice(0, 7),
    active: true,
  });

  useEffect(() => {
    if (!open || !registry) return;
    const billing = registry.billing;
    setForm(
      billing
        ? {
            fee: String(billing.monthlyFee),
            dueDay: String(billing.dueDay),
            start: billing.startMonth,
            active: billing.active,
          }
        : { fee: "", dueDay: "10", start: today.slice(0, 7), active: true },
    );
  }, [open, registry, today]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          registryId: registry!.id,
          monthlyFee: Number(form.fee.replace(",", ".")),
          dueDay: Number(form.dueDay),
          startMonth: form.start,
          active: form.active,
        },
      }),
    onSuccess: async () => {
      await onChanged();
      toast.success("Cobrança salva.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  if (!registry) return null;
  const status = billingStatus(registry.billing, registry.payments, today);
  const fee = Number(form.fee.replace(",", "."));
  const dueDay = Number(form.dueDay);
  const valid = fee > 0 && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 28 && !!form.start;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cobrança · {registry.name}</DialogTitle>
          <DialogDescription>
            Mensalidade com baixa manual: registre aqui cada pagamento recebido fora do sistema.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold">Configuração</h3>
            <BillingBadge kind={status.kind} label={billingStatusLabel(status)} />
          </div>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) saveMutation.mutate();
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Valor mensal (R$)</span>
              <Input
                inputMode="decimal"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                placeholder="300,00"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Dia do vencimento</span>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Cobrar a partir de</span>
              <Input
                type="month"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked === true })}
              />
              Cobrança ligada (desligue para cartórios que não pagam, como o DEMO)
            </label>
            <div className="sm:text-right">
              <Button type="submit" disabled={!valid || saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando…" : "Salvar cobrança"}
              </Button>
            </div>
          </form>
        </section>

        {registry.billing ? (
          <section>
            <h3 className="font-display text-base font-bold">Últimos meses</h3>
            {status.kind === "overdue" ? (
              <p className="mt-1 text-sm font-semibold text-destructive">
                Em aberto: {brl(status.amountDue)} ({status.overdueMonths.length}{" "}
                {status.overdueMonths.length === 1 ? "mês" : "meses"})
              </p>
            ) : null}
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {billingMonths(registry.billing, registry.payments, today).map((month) => (
                <MonthRow
                  key={month.month}
                  registry={registry}
                  month={month}
                  today={today}
                  onChanged={onChanged}
                />
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Salve a configuração para começar a registrar pagamentos.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BillingBadge({ kind, label }: { kind: string; label: string }) {
  const tone =
    kind === "overdue"
      ? "danger"
      : kind === "due_soon"
        ? "warning"
        : kind === "ok"
          ? "positive"
          : "neutral";
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

function MonthRow({
  registry,
  month,
  today,
  onChanged,
}: {
  registry: PlatformRegistry;
  month: BillingMonth;
  today: string;
  onChanged(): Promise<unknown>;
}) {
  const register = useServerFn(registerRegistryPayment);
  const remove = useServerFn(removeRegistryPayment);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    amount: String(registry.billing?.monthlyFee ?? ""),
    paidOn: today,
    method: "pix" as PaymentMethod,
    note: "",
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      register({
        data: {
          registryId: registry.id,
          month: month.month,
          amount: Number(draft.amount.replace(",", ".")),
          paidOn: draft.paidOn,
          method: draft.method,
          note: draft.note,
        },
      }),
    onSuccess: async () => {
      await onChanged();
      setEditing(false);
      toast.success(`Pagamento de ${monthLabel(month.month)} registrado.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível registrar."),
  });
  const removeMutation = useMutation({
    mutationFn: () => remove({ data: { paymentId: month.payment!.id } }),
    onSuccess: async () => {
      await onChanged();
      toast.success(`Pagamento de ${monthLabel(month.month)} desfeito.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível desfazer."),
  });

  const amount = Number(draft.amount.replace(",", "."));
  return (
    <li className="p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold capitalize">{monthLabel(month.month)}</span>
          <span className="ml-2 text-muted-foreground">vence {shortDate(month.dueDate)}</span>
        </div>
        {month.payment ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="positive">
              Pago em {shortDate(month.payment.paidOn)} ·{" "}
              {PAYMENT_METHOD_LABELS[month.payment.method]} · {brl(month.payment.amount)}
            </StatusBadge>
            <Button
              size="sm"
              variant="ghost"
              disabled={removeMutation.isPending}
              onClick={() => {
                if (window.confirm(`Desfazer o pagamento de ${monthLabel(month.month)}?`))
                  removeMutation.mutate();
              }}
            >
              Desfazer
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <StatusBadge tone={month.state === "overdue" ? "danger" : "neutral"}>
              {month.state === "overdue" ? "Atrasado" : "Em aberto"}
            </StatusBadge>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Registrar pagamento
              </Button>
            ) : null}
          </div>
        )}
      </div>
      {month.payment?.note ? (
        <p className="mt-1 text-xs text-muted-foreground">{month.payment.note}</p>
      ) : null}
      {editing && !month.payment ? (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (amount > 0 && draft.paidOn) registerMutation.mutate();
          }}
        >
          <label className="grid gap-1">
            <span className="text-xs font-medium">Valor (R$)</span>
            <Input
              inputMode="decimal"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Pago em</span>
            <Input
              type="date"
              value={draft.paidOn}
              onChange={(e) => setDraft({ ...draft, paidOn: e.target.value })}
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Forma</span>
            <select
              className={fieldClass}
              value={draft.method}
              onChange={(e) => setDraft({ ...draft, method: e.target.value as PaymentMethod })}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Observação</span>
            <Input
              maxLength={300}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Opcional"
            />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!(amount > 0) || !draft.paidOn || registerMutation.isPending}
            >
              {registerMutation.isPending ? "Salvando…" : "Confirmar pagamento"}
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
