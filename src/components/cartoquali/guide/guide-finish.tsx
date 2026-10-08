import { useEffect, useRef } from "react";
import { Award, Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideStep } from "@/lib/guide/content";
import { guidePageFor } from "@/lib/guide/plan";

export function GuideFinish({ steps, onClose }: { steps: GuideStep[]; onClose(): void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const pages = [...new Set(steps.map((step) => step.page))]
    .map((path) => guidePageFor(path)?.label)
    .filter((label): label is string => Boolean(label));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-finish-title"
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-brand-navy/70 p-4 backdrop-blur-sm"
    >
      <div className="animate-enter w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-2xl">
        <div className="guide-seal mx-auto grid size-20 place-items-center rounded-full bg-brand-gold text-brand-navy">
          <Award className="size-10" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-dark">
          Tour concluído
        </p>
        <h2 id="guide-finish-title" className="mt-2 font-display text-3xl font-bold">
          Tudo pronto!
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-left text-sm">
          {pages.map((label, index) => (
            <li
              key={label}
              className="guide-check flex items-center gap-2"
              style={{ animationDelay: `${150 + index * 90}ms` }}
            >
              <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-start gap-2 rounded-lg bg-muted p-3 text-left text-sm text-muted-foreground">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Sempre que precisar, clique no <strong className="text-foreground">?</strong> no topo da
            tela para rever o guia da página ou este tour.
          </span>
        </p>
        <Button ref={closeRef} size="lg" className="mt-6 w-full" onClick={onClose}>
          Começar a usar
        </Button>
      </div>
    </div>
  );
}
