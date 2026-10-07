import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-glass", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Stars({
  value,
  interactive = false,
  onChange,
  size = "md",
}: {
  value: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const iconSize = size === "lg" ? "size-10 sm:size-11" : size === "sm" ? "size-4" : "size-5";
  return (
    <div
      className="flex items-center justify-center gap-1"
      role={interactive ? "radiogroup" : undefined}
      aria-label={`${value} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange?.(star)}
            className="rounded-md p-1.5 text-rating transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={cn(iconSize, star <= value && "fill-current")} />
          </button>
        ) : (
          <Star
            key={star}
            className={cn(iconSize, "text-rating", star <= value && "fill-current")}
          />
        ),
      )}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "positive" | "warning" | "danger" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "positive" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "danger" && "bg-danger-soft text-destructive",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function InterfaceState({
  kind,
  title,
  description,
  action,
}: {
  kind: "loading" | "empty" | "error" | "success";
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon =
    kind === "loading"
      ? LoaderCircle
      : kind === "error"
        ? AlertTriangle
        : kind === "success"
          ? CheckCircle2
          : Inbox;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className="py-10 text-center"
    >
      <Icon
        className={cn(
          "mx-auto size-8",
          kind === "loading" && "animate-spin",
          kind === "error"
            ? "text-destructive"
            : kind === "success"
              ? "text-success"
              : "text-muted-foreground",
        )}
      />
      <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
