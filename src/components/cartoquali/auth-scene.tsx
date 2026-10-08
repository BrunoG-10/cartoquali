import { Check, Star, TrendingUp } from "lucide-react";
import { MiniQr } from "./landing-visuals";

// Illustrative "QR Code → avaliação → indicador" loop for the sign-in screens. Static, fictitious
// data only; the animations live in styles.css and stop under prefers-reduced-motion.

function ScanningQr({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md ${className}`}>
      <MiniQr className="w-full rounded-md" />
      <span aria-hidden="true" className="auth-scan" />
    </div>
  );
}

export function AuthShowcase() {
  return (
    <aside className="auth-showcase relative hidden overflow-hidden bg-brand-navy text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-[640px] lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      <div aria-hidden="true" className="auth-showcase-grid" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
          Avaliação do atendimento
        </p>
        <h2 className="mt-4 max-w-md font-display text-4xl font-bold leading-tight">
          Um QR Code. Todo o atendimento.
        </h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-white/70">
          O cidadão avalia em segundos e o cartório vê, nos indicadores, onde melhorar.
        </p>
      </div>

      <QrJourneyScene className="my-6" />

      <p className="relative text-[11px] text-white/45">Ilustração com dados fictícios.</p>
    </aside>
  );
}

/** Poster → phone → indicator scene, shared by the sign-in screens and the usage guide. */
export function QrJourneyScene({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto h-[410px] w-full max-w-[440px] shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Poster on the counter */}
      <div className="absolute left-0 top-2 w-52 -rotate-3 rounded-xl bg-white p-5 text-center text-brand-navy shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-gold-dark">
          Avalie seu atendimento
        </p>
        <ScanningQr className="mx-auto mt-3 w-32" />
        <p className="mt-3 text-xs font-semibold">Aponte a câmera</p>
      </div>

      {/* Citizen's phone */}
      <div className="absolute right-0 top-10 w-60 rounded-[1.75rem] border-[6px] border-white/90 bg-white p-4 text-brand-navy shadow-2xl">
        <div className="mx-auto h-1 w-12 rounded-full bg-brand-navy/20" />
        <p className="mt-4 text-center font-display text-sm font-bold leading-snug">
          Qual serviço você utilizou hoje?
        </p>
        <div className="mt-3 grid gap-1.5 text-[11px]">
          <span className="auth-chip-selected rounded-md border border-brand-navy/15 px-2.5 py-1.5">
            Escritura
          </span>
          <span className="rounded-md border border-brand-navy/15 px-2.5 py-1.5">Certidões</span>
        </div>
        <p className="mt-4 text-center text-[11px] text-brand-navy/60">Como foi sua experiência?</p>
        <div className="mt-2 flex justify-center gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              className="auth-star size-6 fill-current"
              style={{ animationDelay: `${index * 180}ms` }}
            />
          ))}
        </div>
        <div className="auth-toast mt-4 flex items-center justify-center gap-1.5 rounded-md bg-success-soft px-2 py-1.5 text-[11px] font-semibold text-success">
          <Check className="size-3.5" />
          Avaliação enviada
        </div>
      </div>

      {/* Dashboard indicator */}
      <div className="absolute bottom-0 left-0 w-48 rounded-xl border border-white/15 bg-[#21385f] p-4 shadow-2xl">
        <p className="text-[11px] text-white/70">Satisfação geral</p>
        <div className="mt-1 flex items-end justify-between">
          <div className="relative h-9 w-16 font-display text-3xl font-bold">
            <span className="auth-metric-old absolute inset-0">4,4</span>
            <span className="auth-metric-new absolute inset-0">4,6</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-brand-gold/20 px-2 py-0.5 text-[11px] font-semibold text-brand-gold">
            <TrendingUp className="size-3.5" />
            +0,2
          </span>
        </div>
        <div className="mt-3 flex h-10 items-end gap-1.5">
          {["h-[45%]", "h-[60%]", "h-[52%]", "h-[70%]", "h-[78%]", "h-[92%]"].map(
            (height, index) => (
              <span
                key={index}
                className={`flex-1 rounded-t bg-brand-gold/70 ${height} ${index === 5 ? "auth-bar-last" : ""}`}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthShowcaseCompact() {
  return (
    <div className="auth-showcase relative overflow-hidden bg-brand-navy px-5 py-5 text-white lg:hidden">
      <div aria-hidden="true" className="auth-showcase-grid" />
      <div className="relative mx-auto flex max-w-md items-center gap-4">
        <div aria-hidden="true" className="shrink-0 rounded-lg bg-white p-1.5">
          <ScanningQr className="w-14" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">
            Um QR Code. Todo o atendimento.
          </p>
          <p className="mt-1 text-xs text-white/70">Indicadores que mostram onde melhorar.</p>
        </div>
      </div>
    </div>
  );
}
