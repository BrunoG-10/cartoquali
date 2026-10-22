import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  ClipboardList,
  FileBarChart,
  Gauge,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Users,
  X,
  QrCode,
  ListChecks,
  BriefcaseBusiness,
  LogOut,
  ScrollText,
  UserRoundCheck,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/cartoquali/auth-provider";
import { LogoMark, Wordmark } from "@/components/cartoquali/logo";
import { USER_ROLE_LABELS } from "@/constants/cartoquali";
import { can, moduleForPath, type AppModule } from "@/lib/permissions";
import { DialogLayer } from "@/components/cartoquali/dialog-layer";
import { InterfaceState } from "@/components/cartoquali/primitives";
import { UpdateAvailable } from "@/components/cartoquali/update-available";
import { guidePageFor } from "@/lib/guide/plan";
import { GuideButton } from "@/components/cartoquali/guide/guide-button";
import { useAttentionCounts } from "@/components/cartoquali/use-attention-counts";

type NavItem = { to: string; label: string; icon: LucideIcon; module: AppModule };

// Grouped by what the registry team is doing: follow results, act on problems,
// collect feedback, administer the registry. Platform tools come last.
const navGroups: { label: string; tour?: string; items: NavItem[] }[] = [
  {
    label: "Acompanhar",
    tour: "nav-acompanhar",
    items: [
      { to: "/dashboard", label: "Painel", icon: Gauge, module: "dashboard" },
      { to: "/qualidade", label: "Qualidade", icon: ShieldCheck, module: "quality" },
      { to: "/avaliacoes", label: "Avaliações", icon: MessageSquareText, module: "evaluations" },
      { to: "/relatorios", label: "Relatórios", icon: FileBarChart, module: "reports" },
      {
        to: "/visao-executiva",
        label: "Visão executiva",
        icon: BriefcaseBusiness,
        module: "reports",
      },
    ],
  },
  {
    label: "Agir",
    items: [
      { to: "/ocorrencias", label: "Ocorrências", icon: AlertCircle, module: "occurrences" },
      { to: "/planos-melhoria", label: "Planos de melhoria", icon: ListChecks, module: "plans" },
    ],
  },
  {
    label: "Coletar",
    items: [
      { to: "/pesquisas", label: "Pesquisas", icon: ClipboardList, module: "surveys" },
      { to: "/pontos", label: "QR Code", icon: QrCode, module: "points" },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/cartorio", label: "Cartório", icon: Building2, module: "registry" },
      { to: "/usuarios", label: "Usuários", icon: Users, module: "users" },
      { to: "/configuracoes", label: "Configurações", icon: Settings, module: "settings" },
      {
        to: "/solicitacoes-privacidade",
        label: "Privacidade",
        icon: UserRoundCheck,
        module: "privacy",
      },
      { to: "/auditoria", label: "Auditoria", icon: ScrollText, module: "audit" },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { to: "/plataforma", label: "Painel da plataforma", icon: Activity, module: "platform" },
      { to: "/implantacoes", label: "Implantações", icon: Rocket, module: "onboarding" },
    ],
  },
];

function Brand() {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-3 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LogoMark size={38} />
      <span>
        <Wordmark className="block text-lg leading-none" />
        <small className="text-xs text-muted-foreground">Gestão de qualidade</small>
      </span>
    </Link>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { currentRole } = useAuth();
  const attention = useAttentionCounts();
  const lowRatings = attention.data?.lowRatings ?? 0;
  const groups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(currentRole, item.module)),
    }))
    .filter((group) => group.items.length > 0);
  // min-h-0 + overflow lets the list scroll so the user card below never leaves the screen.
  return (
    <nav
      className="-mx-2 mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-2"
      aria-label="Navegação principal"
    >
      {groups.map((group) => (
        <div key={group.label} data-tour={group.tour} className="mb-4 last:mb-0">
          <p className="px-3 pb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(`${to}/`);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active &&
                        "bg-secondary font-semibold text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-gold",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                    {to === "/avaliacoes" && lowRatings > 0 ? (
                      <span
                        className="ml-auto grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-5 text-destructive-foreground"
                        aria-label={`${lowRatings} ${lowRatings === 1 ? "avaliação" : "avaliações"} com nota 1 ou 2 aguardando análise`}
                      >
                        {lowRatings}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard() {
  const { usuario, cartorio, currentRole, signOut } = useAuth();
  return (
    <div className="mt-3 shrink-0 rounded-lg border border-border bg-card p-3">
      <p className="truncate text-sm font-semibold">{usuario?.name}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{cartorio?.name}</p>
      {currentRole && (
        <p className="mt-1 text-xs text-accent-foreground">{USER_ROLE_LABELS[currentRole]}</p>
      )}
      <Button
        className="mt-2 w-full justify-start"
        size="sm"
        variant="ghost"
        onClick={() => void signOut()}
      >
        <LogOut />
        Sair
      </Button>
    </div>
  );
}

/** Desktop top bar: current page name and the "?" guide button. */
function AppTopbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const label = guidePageFor(pathname)?.label ?? "CartoQuali";
  return (
    <div
      data-print="hide"
      className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-border bg-card/95 px-8 backdrop-blur lg:flex"
    >
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <GuideButton />
    </div>
  );
}

/** Shown instead of a page the current role cannot open (e.g. a typed URL). */
function NoAccess() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <InterfaceState
        kind="error"
        title="Sem acesso a esta tela"
        description="Seu perfil não tem permissão para abrir esta página. Fale com o administrador do cartório se precisar desse acesso."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Voltar ao painel</Link>
          </Button>
        }
      />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { currentRole } = useAuth();
  const requiredModule = moduleForPath(pathname);
  const blocked = Boolean(currentRole && requiredModule && !can(currentRole, requiredModule));
  // overflow-x-clip (not hidden): "hidden" would turn this div into a scroll container and break the sticky sidebar.
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      {/* Full width: the sidebar sits on the left edge and content fills any screen size. */}
      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex">
          <Brand />
          <Navigation />
          <UserCard />
        </aside>
        {mobileOpen && (
          <DialogLayer
            label="Menu"
            onClose={() => setMobileOpen(false)}
            closeOnBackdrop={false}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <button
              aria-label="Fechar menu"
              tabIndex={-1}
              className="absolute inset-0 bg-foreground/30"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-[280px] flex-col border-r border-border bg-card p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Brand />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <Navigation onNavigate={() => setMobileOpen(false)} />
              <UserCard />
            </aside>
          </DialogLayer>
        )}
        <div className="min-w-0 flex-1">
          <div
            data-print="hide"
            className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden"
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <Brand />
            <GuideButton />
          </div>
          <AppTopbar />
          <main className="p-4 sm:p-6 lg:p-8">
            {blocked ? <NoAccess /> : children}
            <p data-print="hide" className="mt-8 text-center text-xs text-muted-foreground">
              <Wordmark className="text-xs" /> · A voz de quem é atendido, transformada em gestão da
              qualidade.
            </p>
          </main>
        </div>
      </div>
      <UpdateAvailable />
    </div>
  );
}
