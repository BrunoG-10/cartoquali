import {
  BarChart3,
  Check,
  Clock3,
  ExternalLink,
  MessageSquareText,
  QrCode,
  Star,
  TrendingUp,
} from "lucide-react";
import { LogoMark } from "@/components/cartoquali/logo";

const bars = ["h-[42%]", "h-[58%]", "h-[49%]", "h-[71%]", "h-[66%]", "h-[84%]", "h-[92%]"];
const qrCells = new Set([
  0, 1, 2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 18, 19, 20, 22, 24, 26, 28, 30, 31, 32, 34, 36, 38, 40,
  42, 44, 45, 46, 48,
]);

export function MiniQr({ className = "" }: { className?: string }) {
  return (
    <div
      aria-label="Representação de QR Code"
      className={`grid aspect-square grid-cols-7 gap-0.5 bg-white p-2 ${className}`}
    >
      {Array.from({ length: 49 }, (_, index) => (
        <span key={index} className={qrCells.has(index) ? "bg-brand-navy" : "bg-white"} />
      ))}
    </div>
  );
}

export function ProductScene() {
  return (
    <div className="relative mx-auto w-full max-w-2xl" aria-label="Visão ilustrativa do CartoQuali">
      <p className="mb-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Interface ilustrativa
      </p>
      <div className="overflow-hidden rounded-xl border border-glass-border bg-card shadow-glass">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <LogoMark size={28} inverse />
            <span className="font-display text-xs font-semibold">Painel de qualidade</span>
          </div>
          <span className="rounded-full bg-success-soft px-2 py-1 text-[10px] font-semibold text-success">
            Últimos 30 dias
          </span>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
          {[
            ["Satisfação", "91,4%", "+4,2%"],
            ["Nota média", "4,6 / 5", "Estável"],
            ["Avaliações", "284", "+37"],
          ].map(([label, value, delta]) => (
            <div key={label} className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-xl font-bold">{value}</p>
              <p className="mt-1 text-[10px] font-semibold text-success">{delta}</p>
            </div>
          ))}
          <div className="rounded-lg border border-border bg-background p-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Evolução da satisfação</p>
                <p className="text-[10px] text-muted-foreground">Percepção ao longo do período</p>
              </div>
              <TrendingUp className="size-4 text-success" />
            </div>
            <div className="mt-4 flex h-24 items-end gap-2">
              {bars.map((height, index) => (
                <span key={index} className={`flex-1 rounded-t-sm bg-primary/70 ${height}`} />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-semibold">Dimensões</p>
            {[
              ["Cordialidade", "94%"],
              ["Clareza", "88%"],
              ["Tempo", "81%"],
            ].map(([label, value]) => (
              <div key={label} className="mt-3">
                <div className="flex justify-between text-[10px]">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full w-4/5 rounded-full bg-accent-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-2 hidden w-40 rounded-lg border border-border bg-card p-3 shadow-lg sm:block">
        <div className="flex items-center gap-2">
          <Star className="size-5 fill-current text-rating" aria-hidden="true" />
          <strong className="font-display text-lg text-foreground">5/5</strong>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Avaliação recebida agora</p>
      </div>
      <div className="absolute -bottom-10 right-2 hidden w-32 items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-lg sm:flex">
        <MiniQr className="size-12 shrink-0" />
        <span className="text-[9px] font-semibold leading-3">Aponte a câmera e avalie</span>
      </div>
    </div>
  );
}

export function DashboardScene() {
  return (
    <div>
      <p className="mb-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Dados ilustrativos
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-glass">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="text-xs font-semibold text-primary">Visão geral</p>
            <p className="font-display text-lg font-bold">Qualidade percebida</p>
          </div>
          <BarChart3 className="text-primary" />
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-4">
          {[
            ["Satisfação", "91,4%"],
            ["Média", "4,6"],
            ["Negativas", "7"],
            ["Volume", "284"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted/60 p-3">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="font-display text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 px-4 pb-4 md:grid-cols-[1.6fr_1fr]">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-semibold">Evolução mensal</p>
            <div className="mt-3 flex h-36 items-end gap-3">
              {bars.map((height, index) => (
                <span key={index} className={`flex-1 rounded-t bg-primary ${height}`} />
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold">Indicadores</p>
            {[
              ["Resolutividade", "89%"],
              ["Tempo", "81%"],
              ["Clareza", "88%"],
              ["Instalações", "92%"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border py-2 text-xs last:border-0"
              >
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QrTotemScene() {
  return (
    <div className="mx-auto max-w-xs rotate-[-1deg] rounded-xl bg-foreground p-6 text-center text-primary-foreground shadow-2xl">
      <LogoMark size={44} className="mx-auto" />
      <p className="mt-5 font-display text-xl font-bold">Como foi seu atendimento?</p>
      <p className="mt-2 text-xs text-primary-foreground/70">Sua opinião ajuda a melhorar.</p>
      <MiniQr className="mx-auto mt-5 w-36 rounded-md" />
      <p className="mt-4 text-sm font-semibold">Aponte a câmera</p>
      <div className="mt-5 flex justify-center gap-2 text-[10px]">
        <span className="rounded-full bg-primary-foreground/10 px-2 py-1">Sem aplicativo</span>
        <span className="rounded-full bg-primary-foreground/10 px-2 py-1">Sem conta</span>
      </div>
    </div>
  );
}

export function EvaluationPhone() {
  return (
    <div className="mx-auto w-64 rounded-[2rem] border-8 border-[#2c3a54] bg-card p-5 shadow-2xl">
      <div className="mx-auto h-1.5 w-16 rounded-full bg-white/25" />
      <div className="mt-8 text-center">
        <LogoMark size={36} inverse className="mx-auto" />
        <p className="mt-5 text-xs text-muted-foreground">Como foi sua experiência hoje?</p>
        <div className="mt-4 flex justify-center gap-1 text-rating">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-7 fill-current" />
          ))}
        </div>
        <div className="mt-6 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          Enviar avaliação
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Clock3 className="size-3" />
          Leva poucos instantes
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <MessageSquareText className="size-3" />
          Sem conta obrigatória
        </div>
      </div>
    </div>
  );
}

/** Thank-you screen with the Google invite, mirroring `GoogleInvite`: same text for every rating. */
export function GoogleInviteScene() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <p className="mb-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Exemplo ilustrativo
      </p>
      <div className="mx-auto w-72 rounded-[2rem] border-8 border-[#2c3a54] bg-card p-5 shadow-2xl">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-white/25" />
        <div className="mt-6 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-success-soft text-success">
            <Check className="size-5" />
          </span>
          <p className="mt-3 font-display text-base font-bold">Obrigado pela avaliação!</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sua opinião ajuda o cartório a melhorar.
          </p>
        </div>
        <div className="mt-5 rounded-lg border border-border p-3 text-left">
          <p className="font-display text-sm font-bold leading-snug">
            Quer deixar sua opinião também no Google?
          </p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Seu comentário será copiado. É só marcar as estrelas e colar.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold">
            <span className="flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-2 text-primary-foreground">
              Publicar no Google
              <ExternalLink className="size-3" />
            </span>
            <span className="rounded-md border border-border px-2 py-2 text-center">Agora não</span>
          </div>
        </div>
      </div>
      <div className="relative -mt-7 w-52 rounded-lg border border-border bg-card p-3 shadow-glass">
        <p className="text-[10px] text-muted-foreground">Convites para o Google</p>
        <p className="mt-1 font-display text-xl font-bold">97</p>
        <p className="mt-1 text-[10px] font-semibold text-success">
          34% das avaliações abriram o Google
        </p>
      </div>
    </div>
  );
}
