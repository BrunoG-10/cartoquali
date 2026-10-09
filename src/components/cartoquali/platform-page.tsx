import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Rocket, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel, InterfaceState, PageHeader, StatusBadge } from "./primitives";
import { BillingBadge, BillingDialog, brl, shortDate } from "./billing-dialog";
import { getPlatformOverview } from "@/lib/platform.functions";
import { registryAlert, STALE_DAYS, type PlatformRegistry } from "@/lib/platform-overview";
import {
  billingStatus,
  billingStatusLabel,
  todayInSaoPaulo,
  type BillingStatus,
} from "@/lib/billing";

const ONBOARDING_LABELS: Record<string, string> = {
  IN_PROGRESS: "Em implantação",
  READY_FOR_TEST: "Pronto para teste",
  BLOCKED: "Implantação bloqueada",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : "Nunca");
const average = (value: number | null) =>
  value == null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function SituationBadge({ registry }: { registry: PlatformRegistry }) {
  if (registry.status === "inativo") return <StatusBadge>Inativo</StatusBadge>;
  const onboarding = registry.onboardingStatus && ONBOARDING_LABELS[registry.onboardingStatus];
  if (onboarding) return <StatusBadge tone="warning">{onboarding}</StatusBadge>;
  return <StatusBadge tone="positive">Ativo</StatusBadge>;
}

function AlertLines({ texts }: { texts: string[] }) {
  return texts.map((text) => (
    <p key={text} className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      {text}
    </p>
  ));
}

function Name({ registry }: { registry: PlatformRegistry }) {
  return (
    <>
      <span className="font-semibold text-foreground">{registry.name}</span>
      {registry.environmentKind === "demo" ? (
        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
          Demonstração
        </span>
      ) : null}
      <span className="block text-xs text-muted-foreground">
        {registry.city}/{registry.state}
      </span>
    </>
  );
}

function Payment({ status }: { status: BillingStatus }) {
  return (
    <>
      <BillingBadge kind={status.kind} label={billingStatusLabel(status)} />
      {status.kind !== "none" ? (
        <span className="mt-1 block text-xs text-muted-foreground">
          {status.kind === "overdue"
            ? `${brl(status.amountDue)} em aberto`
            : `Próximo: ${shortDate(status.nextDue)}`}
        </span>
      ) : null}
    </>
  );
}

const fee = (registry: PlatformRegistry) =>
  registry.billing?.active
    ? `${brl(registry.billing.monthlyFee)} · dia ${registry.billing.dueDay}`
    : "—";

export function PlatformPage() {
  const load = useServerFn(getPlatformOverview);
  const query = useQuery({ queryKey: ["platform-overview"], queryFn: () => load() });
  const [billingId, setBillingId] = useState<string>();

  if (query.isLoading)
    return (
      <GlassPanel>
        <InterfaceState
          kind="loading"
          title="Carregando painel"
          description="Reunindo os números de cada cartório."
        />
      </GlassPanel>
    );
  if (query.isError || !query.data)
    return (
      <GlassPanel>
        <InterfaceState
          kind="error"
          title="Painel indisponível"
          description={query.error instanceof Error ? query.error.message : "Tente novamente."}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </GlassPanel>
    );

  const { registries, hiddenCount } = query.data;
  const now = new Date();
  const today = todayInSaoPaulo(now);
  const rows = registries.map((registry) => {
    const payment = billingStatus(registry.billing, registry.payments, today);
    const usage = registryAlert(registry, now);
    const alerts = [
      usage,
      payment.kind === "overdue" ? `Pagamento ${billingStatusLabel(payment).toLowerCase()}` : null,
    ].filter((text): text is string => !!text);
    return { registry, payment, alerts };
  });
  const overdue = rows.filter((row) => row.payment.kind === "overdue");
  const totals = {
    active: registries.filter((r) => r.status === "ativo").length,
    evaluations7d: registries.reduce((sum, r) => sum + r.evaluations7d, 0),
    openOccurrences: registries.reduce((sum, r) => sum + r.openOccurrences, 0),
    alerts: rows.filter((row) => row.alerts.length).length,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce(
      (sum, row) => sum + (row.payment.kind === "overdue" ? row.payment.amountDue : 0),
      0,
    ),
  };
  const billingRegistry = registries.find((registry) => registry.id === billingId);

  const billingButton = (registry: PlatformRegistry) => (
    <Button size="sm" variant="outline" onClick={() => setBillingId(registry.id)}>
      <Wallet aria-hidden />
      Cobrança
    </Button>
  );

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Painel da plataforma"
        description="Acompanhe uso e pagamentos de todos os cartórios."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : undefined} />
              Atualizar
            </Button>
            <Button asChild>
              <Link to="/implantacoes">
                <Rocket />
                Implantações
              </Link>
            </Button>
          </div>
        }
      />

      <div data-tour="platform-summary" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Cartórios ativos", value: String(totals.active) },
          { label: "Avaliações em 7 dias", value: String(totals.evaluations7d) },
          { label: "Ocorrências abertas", value: String(totals.openOccurrences) },
          {
            label: "Cartórios com alerta",
            value: String(totals.alerts),
            danger: totals.alerts > 0,
          },
          {
            label: "Pagamentos atrasados",
            value: String(totals.overdueCount),
            detail: totals.overdueCount ? brl(totals.overdueAmount) : null,
            danger: totals.overdueCount > 0,
            wide: true,
          },
        ].map((card) => (
          <GlassPanel
            key={card.label}
            className={`p-4 ${card.wide ? "col-span-2 lg:col-span-1" : ""}`}
          >
            <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
            <p
              className={`mt-1 font-display text-2xl font-bold ${card.danger ? "text-destructive" : "text-foreground"}`}
            >
              {card.value}
              {card.detail ? (
                <span className="ml-2 text-sm font-semibold">{card.detail}</span>
              ) : null}
            </p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel tour="platform-list" className="p-0">
        {rows.length === 0 ? (
          <div className="p-5">
            <InterfaceState
              kind="empty"
              title="Nenhum cartório"
              description="Cadastre o primeiro cartório em Implantações."
            />
          </div>
        ) : (
          <>
            {/* Celular e tablet: um cartão por cartório */}
            <ul className="divide-y divide-border lg:hidden">
              {rows.map(({ registry, payment, alerts }) => (
                <li key={registry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Name registry={registry} />
                    </div>
                    <SituationBadge registry={registry} />
                  </div>
                  <AlertLines texts={alerts} />
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Avaliações 7 / 30 dias</dt>
                      <dd className="font-semibold">
                        {registry.evaluations7d} / {registry.evaluations30d}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Nota média (30 dias)</dt>
                      <dd className="font-semibold">{average(registry.average30d)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Última avaliação</dt>
                      <dd>{when(registry.lastEvaluationAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Ocorrências abertas</dt>
                      <dd className="font-semibold">{registry.openOccurrences}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Usuários ativos</dt>
                      <dd className="font-semibold">{registry.activeUsers}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Último acesso</dt>
                      <dd>{when(registry.lastAccessAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Mensalidade</dt>
                      <dd className="font-semibold">{fee(registry)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Pagamento</dt>
                      <dd>
                        <Payment status={payment} />
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">{billingButton(registry)}</div>
                </li>
              ))}
            </ul>

            {/* Computador: tabela */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cartório</th>
                    <th className="px-4 py-3 font-semibold">Situação</th>
                    <th className="px-4 py-3 text-right font-semibold">Aval. 7d / 30d</th>
                    <th className="px-4 py-3 text-right font-semibold">Nota 30d</th>
                    <th className="px-4 py-3 font-semibold">Última avaliação</th>
                    <th className="px-4 py-3 text-right font-semibold">Ocorr. abertas</th>
                    <th className="px-4 py-3 text-right font-semibold">Usuários</th>
                    <th className="px-4 py-3 font-semibold">Último acesso</th>
                    <th className="px-4 py-3 font-semibold">Mensalidade</th>
                    <th className="px-4 py-3 font-semibold">Pagamento</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(({ registry, payment, alerts }) => (
                    <tr
                      key={registry.id}
                      className={alerts.length ? "bg-destructive/5" : undefined}
                    >
                      <td className="px-4 py-3">
                        <Name registry={registry} />
                        <AlertLines texts={alerts} />
                      </td>
                      <td className="px-4 py-3">
                        <SituationBadge registry={registry} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {registry.evaluations7d} / {registry.evaluations30d}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {average(registry.average30d)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {when(registry.lastEvaluationAt)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {registry.openOccurrences}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{registry.activeUsers}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{when(registry.lastAccessAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fee(registry)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Payment status={payment} />
                      </td>
                      <td className="px-4 py-3 text-right">{billingButton(registry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GlassPanel>

      <p className="mt-3 text-xs text-muted-foreground">
        Alertas: cartório ativo sem avaliações há mais de {STALE_DAYS} dias (QR Code fora do lugar
        ou parado) e mensalidade vencida sem pagamento registrado. Avaliações de teste da
        implantação não entram nos números.
        {hiddenCount > 0
          ? ` ${hiddenCount} cartório${hiddenCount > 1 ? "s" : ""} de teste oculto${hiddenCount > 1 ? "s" : ""}.`
          : ""}
      </p>

      <BillingDialog
        registry={billingRegistry}
        open={!!billingRegistry}
        onOpenChange={(open) => !open && setBillingId(undefined)}
        onChanged={() => query.refetch()}
      />
    </div>
  );
}
