import { cn } from "@/lib/utils";

// CartoQuali "selo de conformidade": a notarial seal with a quality check.
// Brand colors are fixed (not theme tokens) so the mark looks the same everywhere.
const NAVY = "#16294A";
const PAPER = "#F7F5F0";
const GOLD = "#B08D57";
const GOLD_LIGHT = "#C9A86A";
const GOLD_DARK = "#9A7A45";

export function LogoMark({ size = 40, inverse = false, className }: { size?: number; inverse?: boolean; className?: string }) {
  // Below ~24px the inner ring turns to noise; drop it and thicken the check.
  const compact = size < 24;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      <circle cx="24" cy="24" r="23" fill={inverse ? PAPER : NAVY} />
      {!compact && <circle cx="24" cy="24" r="18" fill="none" stroke={GOLD} strokeWidth="1.5" />}
      <path
        d={compact ? "M14 24.5 L21 31.5 L34 17" : "M15.5 24.5 L21.5 30.5 L33 18"}
        fill="none"
        stroke={inverse ? GOLD_DARK : GOLD_LIGHT}
        strokeWidth={compact ? 6 : 4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span className={cn("font-display font-semibold tracking-tight", inverse ? "text-[#F7F5F0]" : "text-brand-navy", className)}>
      Carto<span className={inverse ? "text-[#D9BC85]" : "text-brand-gold-dark"}>Quali</span>
    </span>
  );
}
