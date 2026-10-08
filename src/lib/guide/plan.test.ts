import { describe, expect, it } from "vitest";
import { GUIDE_PAGES, PAGE_GUIDES, TOUR_STEPS } from "./content";
import {
  availableSteps,
  buildTour,
  guideKeyAction,
  pageGuide,
  progressLabel,
  resolveTarget,
  resumeIndex,
} from "./plan";

describe("guide content", () => {
  it("has the 17 tour steps of the spec, starting at the dashboard", () => {
    expect(TOUR_STEPS).toHaveLength(17);
    expect(TOUR_STEPS[0]?.page).toBe("/dashboard");
  });

  it("only references known pages", () => {
    const paths = new Set(GUIDE_PAGES.map((page) => page.path));
    for (const step of TOUR_STEPS) expect(paths.has(step.page)).toBe(true);
    for (const path of Object.keys(PAGE_GUIDES)) expect(paths.has(path)).toBe(true);
  });

  it("gives every page in the menu its own guide of 3 to 6 steps", () => {
    for (const page of GUIDE_PAGES) {
      const steps = PAGE_GUIDES[page.path] ?? [];
      expect(steps.length, page.path).toBeGreaterThanOrEqual(3);
      expect(steps.length, page.path).toBeLessThanOrEqual(6);
    }
  });
});

describe("buildTour", () => {
  it("covers the 9 day-to-day pages for an administrator", () => {
    const tour = buildTour("registry_admin");
    expect(tour).toHaveLength(17);
    expect(new Set(tour.map((step) => step.page)).size).toBe(9);
  });

  it("skips pages the operator cannot see", () => {
    const pages = buildTour("operator").map((step) => step.page);
    expect(pages).not.toContain("/pesquisas");
    expect(pages).not.toContain("/pontos");
    expect(pages).toContain("/avaliacoes");
  });

  it("is empty without a role", () => {
    expect(buildTour(null)).toEqual([]);
  });
});

describe("progressLabel", () => {
  it("counts pages, not balloons", () => {
    expect(progressLabel(buildTour("registry_admin"), 5)).toBe("Etapa 3 de 9 · Avaliações");
  });

  it("uses the operator's own total", () => {
    const tour = buildTour("operator");
    expect(progressLabel(tour, tour.length - 1)).toBe("Etapa 7 de 7 · Planos de melhoria");
  });
});

describe("resumeIndex", () => {
  it("clamps the saved step into the tour", () => {
    expect(resumeIndex(99, 17)).toBe(16);
    expect(resumeIndex(-1, 17)).toBe(0);
    expect(resumeIndex(4, 17)).toBe(4);
    expect(resumeIndex(3, 0)).toBe(0);
  });
});

describe("pageGuide", () => {
  it("respects permissions", () => {
    expect(pageGuide("/cartorio", "operator")).toEqual([]);
    expect(pageGuide("/cartorio", "registry_admin").length).toBeGreaterThanOrEqual(3);
  });

  it("is empty for unknown pages", () => {
    expect(pageGuide("/nao-existe", "registry_admin")).toEqual([]);
  });
});

describe("availableSteps", () => {
  it("keeps centered balloons and those whose target is on screen", () => {
    const steps = pageGuide("/pesquisas", "registry_admin");
    const onList = new Set(["surveys-list", "surveys-configure"]);
    const result = availableSteps(steps, (target) => onList.has(target));
    expect(result.map((step) => step.target)).toEqual(["surveys-list", "surveys-configure"]);
  });

  it("keeps null targets", () => {
    const steps = pageGuide("/cartorio", "registry_admin").concat([
      { page: "/cartorio", target: null, title: "t", text: "x" },
    ]);
    expect(availableSteps(steps, () => false)).toHaveLength(1);
  });
});

describe("guideKeyAction", () => {
  it("maps arrow keys to next/previous", () => {
    expect(guideKeyAction("ArrowRight")).toBe("next");
    expect(guideKeyAction("ArrowLeft")).toBe("previous");
    expect(guideKeyAction("Enter")).toBeNull();
  });
});

describe("resolveTarget", () => {
  const el = (visible: boolean) =>
    ({ getClientRects: () => ({ length: visible ? 1 : 0 }) }) as unknown as Element;

  it("returns null when the target is missing", () => {
    const doc = { querySelectorAll: () => [] } as unknown as Document;
    expect(resolveTarget("inexistente", doc)).toBeNull();
  });

  it("queries by data-tour and prefers the visible copy (desktop table vs mobile cards)", () => {
    let selector = "";
    const hidden = el(false);
    const shown = el(true);
    const doc = {
      querySelectorAll: (value: string) => {
        selector = value;
        return [hidden, shown];
      },
    } as unknown as Document;
    expect(resolveTarget("reviews-list", doc)).toBe(shown);
    expect(selector).toBe('[data-tour="reviews-list"]');
  });

  it("returns null when every copy is hidden", () => {
    const doc = { querySelectorAll: () => [el(false)] } as unknown as Document;
    expect(resolveTarget("reviews-list", doc)).toBeNull();
  });
});
