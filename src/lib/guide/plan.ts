import { can } from "@/lib/permissions";
import type { UserRole } from "@/types/cartoquali";
import { GUIDE_PAGES, PAGE_GUIDES, TOUR_STEPS, type GuidePage, type GuideStep } from "./content";

/** True on the page itself or one of its sub-pages (/relatorios/qualidade), never on /pontos-extra. */
export function isOnPage(path: string, page: string): boolean {
  return path === page || path.startsWith(`${page}/`);
}

export function guidePageFor(path: string): GuidePage | undefined {
  return GUIDE_PAGES.find((page) => isOnPage(path, page.path));
}

const visible = (role: UserRole | null, path: string) => {
  const page = guidePageFor(path);
  return Boolean(page && can(role, page.module));
};

/** Tour completo filtrado pelas telas que o perfil enxerga. */
export function buildTour(role: UserRole | null): GuideStep[] {
  return TOUR_STEPS.filter((step) => visible(role, step.page));
}

export function resumeIndex(savedStep: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(Math.trunc(savedStep), 0), total - 1);
}

/** "Etapa 3 de 9 · Avaliações" — conta telas, não balões. */
export function progressLabel(steps: GuideStep[], index: number): string {
  const pages = [...new Set(steps.map((step) => step.page))];
  const current = steps[index]?.page ?? pages[0] ?? "";
  const label = guidePageFor(current)?.label ?? "";
  return `Etapa ${pages.indexOf(current) + 1} de ${pages.length} · ${label}`;
}

export function pageGuide(path: string, role: UserRole | null): GuideStep[] {
  const page = guidePageFor(path);
  if (!page || !can(role, page.module)) return [];
  return [...(PAGE_GUIDES[page.path] ?? [])];
}

/** Page guides only show balloons whose target is on screen now (or centered ones). */
export function availableSteps(
  steps: GuideStep[],
  isOnScreen: (target: string) => boolean,
): GuideStep[] {
  return steps.filter((step) => step.target === null || isOnScreen(step.target));
}

/** Arrow keys move the guide (driver.js only handles them in its own drive() mode). */
export function guideKeyAction(key: string): "next" | "previous" | null {
  if (key === "ArrowRight") return "next";
  if (key === "ArrowLeft") return "previous";
  return null;
}

/** First visible element with this data-tour (lists render a desktop table and mobile cards). */
export function resolveTarget(target: string, doc: Document = document): Element | null {
  const matches = Array.from(doc.querySelectorAll(`[data-tour="${target}"]`));
  return matches.find((element) => element.getClientRects().length > 0) ?? null;
}
