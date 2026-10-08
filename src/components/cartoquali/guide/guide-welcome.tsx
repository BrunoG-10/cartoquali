import { useEffect, useRef } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/cartoquali/logo";
import { QrJourneyScene } from "@/components/cartoquali/auth-scene";

export function GuideWelcome({
  name,
  resuming,
  onStart,
  onRestart,
  onLater,
}: {
  name: string;
  resuming: boolean;
  onStart(): void;
  onRestart(): void;
  onLater(): void;
}) {
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLater]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-welcome-title"
      className="auth-showcase fixed inset-0 z-[70] overflow-y-auto bg-brand-navy text-white"
    >
      <div aria-hidden="true" className="auth-showcase-grid" />
      <div className="relative mx-auto grid min-h-full max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_1fr]">
        <div className="animate-enter">
          <LogoMark size={52} inverse />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
            Guia de uso
          </p>
          <h1
            id="guide-welcome-title"
            className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl"
          >
            {resuming
              ? `Bem-vindo de volta${name ? `, ${name}` : ""}!`
              : `Olá${name ? `, ${name}` : ""}! Boas-vindas ao CartoQuali.`}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
            {resuming
              ? "Vamos continuar o tour de onde você parou."
              : "Em cerca de 3 minutos você vai conhecer as telas que usará no dia a dia: como acompanhar a satisfação, agir sobre problemas e coletar avaliações."}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
            <Clock3 className="size-4" aria-hidden="true" />
            Você pode pausar a qualquer momento e continuar no próximo acesso.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              ref={startRef}
              size="lg"
              className="bg-brand-gold text-brand-navy hover:bg-brand-gold/90"
              onClick={onStart}
            >
              {resuming ? "Continuar de onde parei" : "Começar o tour"}
              <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={onLater}
            >
              Continuar depois
            </Button>
          </div>
          {resuming && (
            <button
              type="button"
              className="mt-4 text-sm text-white/70 underline underline-offset-4 hover:text-white"
              onClick={onRestart}
            >
              Recomeçar do início
            </button>
          )}
        </div>
        <div className="hidden lg:block">
          <QrJourneyScene />
        </div>
      </div>
    </div>
  );
}
