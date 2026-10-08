import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/components/cartoquali/auth-provider";
import type { GuideStep } from "@/lib/guide/content";
import { saveGuideProgress } from "@/lib/guide.functions";
import {
  availableSteps,
  buildTour,
  guideKeyAction,
  isOnPage,
  pageGuide,
  progressLabel,
  resolveTarget,
  resumeIndex,
} from "@/lib/guide/plan";
import { isGuidePostponed, markGuidePostponed } from "@/lib/guide/postponed";
import { GuideFinish } from "./guide-finish";
import { GuideWelcome, type WelcomeVariant } from "./guide-welcome";

// Guia de uso. Spec: docs/superpowers/specs/2026-10-07-guia-de-uso-design.md
// Lives in the authenticated layout (not the per-page AppShell) so it survives page changes.

type Mode = "idle" | "welcome" | "tour" | "finish" | "page";
type GuideValue = {
  startTour(): void;
  startPageGuide(): void;
  hasPageGuide: boolean;
  running: boolean;
};

const GuideContext = createContext<GuideValue | undefined>(undefined);
// A page with no data may never render a target; after this, the balloon is centered.
const TARGET_TIMEOUT_MS = 2500;

function waitForTarget(target: string | null): Promise<Element | null> {
  if (!target) return Promise.resolve(null);
  const started = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      const element = resolveTarget(target);
      if (element || Date.now() - started > TARGET_TIMEOUT_MS) resolve(element);
      else window.setTimeout(poll, 100);
    };
    poll();
  });
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const { guide, setGuide, currentRole, usuario, status } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const persist = useServerFn(saveGuideProgress);
  const [mode, setMode] = useState<Mode>("idle");
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [index, setIndex] = useState(0);
  const driverRef = useRef<Driver | null>(null);
  const closingRef = useRef(false);
  const expectedPathRef = useRef<string | null>(null);
  const autoOpenedRef = useRef(false);
  const actionsRef = useRef<{ next(): void; previous(): void } | null>(null);
  const completedRef = useRef(Boolean(guide?.completedAt));
  completedRef.current = Boolean(guide?.completedAt);

  const tourSteps = useMemo(() => buildTour(currentRole), [currentRole]);
  const currentPageSteps = useMemo(() => pageGuide(pathname, currentRole), [pathname, currentRole]);

  const closeDriver = useCallback(() => {
    closingRef.current = true;
    driverRef.current?.destroy();
    driverRef.current = null;
    closingRef.current = false;
    expectedPathRef.current = null;
    actionsRef.current = null;
  }, []);

  const ensureDriver = useCallback(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    driverRef.current ??= driver({
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      overlayColor: "#16294a",
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 12,
      allowClose: true,
      overlayClickBehavior: "none",
      disableActiveInteraction: true,
      popoverClass: "cq-guide-popover",
      onDestroyStarted: () => {
        if (closingRef.current) return;
        postponeRef.current();
      },
    });
    return driverRef.current;
  }, []);

  const save = useCallback(
    (step: number, completed = false) => {
      void persist({ data: { step, completed } })
        .then((progress) => setGuide(progress))
        .catch((error) => console.warn("guide progress not saved", error));
    },
    [persist, setGuide],
  );

  /** "Continuar depois": keeps the current step for the next login. */
  const postpone = useCallback(() => {
    const wasTour = mode === "tour";
    const wasAuto = mode === "tour" || mode === "welcome";
    closeDriver();
    setMode("idle");
    if (wasAuto && !guide?.completedAt) markGuidePostponed();
    if (wasTour && !guide?.completedAt) save(index);
  }, [closeDriver, guide?.completedAt, index, mode, save]);

  // The driver instance outlives a render; its destroy hook must always call the latest postpone.
  const postponeRef = useRef(postpone);
  postponeRef.current = postpone;

  const finishTour = useCallback(() => {
    closeDriver();
    setMode("finish");
    if (!guide?.completedAt) save(steps.length, true);
  }, [closeDriver, guide?.completedAt, save, steps.length]);

  // First login (or an unfinished tour): open the welcome once per page load.
  useEffect(() => {
    if (autoOpenedRef.current || status !== "authenticated" || !guide || guide.completedAt) return;
    if (!tourSteps.length || isGuidePostponed()) return;
    autoOpenedRef.current = true;
    setSteps(tourSteps);
    setIndex(resumeIndex(guide.step, tourSteps.length));
    setMode("welcome");
  }, [guide, status, tourSteps]);

  // Clicking a menu link mid-tour counts as "Continuar depois".
  useEffect(() => {
    const expected = expectedPathRef.current;
    if ((mode === "tour" || mode === "page") && expected && !isOnPage(pathname, expected))
      postpone();
  }, [mode, pathname, postpone]);

  // Show the current step: navigate if needed, wait for the target, then highlight it.
  useEffect(() => {
    if (mode !== "tour" && mode !== "page") return;
    const step = steps[index];
    if (!step) return;
    let cancelled = false;
    const isTour = mode === "tour";
    const isLast = index === steps.length - 1;
    expectedPathRef.current = step.page;
    // Read through a ref: this effect must react to step changes only, never to the user
    // navigating away (that is handled above as "Continuar depois").
    if (!isOnPage(pathnameRef.current, step.page)) void navigate({ to: step.page });

    // Save every step of the full tour, so a reload or a closed tab resumes where the person was.
    if (isTour && !completedRef.current) save(index);

    const next = () => {
      if (!isLast) setIndex(index + 1);
      else if (isTour) finishTour();
      else postpone();
    };
    const previous = () => {
      if (index > 0) setIndex(index - 1);
    };
    // Until the target shows up (new page loading), replace the previous balloon with a neutral
    // one, so its buttons never look dead.
    actionsRef.current = null;
    if (step.target && !resolveTarget(step.target))
      ensureDriver().highlight({
        popover: {
          title: "Carregando…",
          description: "Abrindo a próxima tela do guia.",
          showButtons: ["close"],
          onCloseClick: () => postpone(),
        },
      });

    void waitForTarget(step.target).then((element) => {
      if (cancelled) return;
      actionsRef.current = { next, previous };
      ensureDriver().highlight({
        ...(element ? { element } : {}),
        popover: {
          title: step.title,
          description: step.text,
          side: "bottom",
          align: "start",
          showButtons: index === 0 ? ["next", "close"] : ["previous", "next", "close"],
          nextBtnText: isLast ? (isTour ? "Concluir" : "Entendi") : "Próximo",
          prevBtnText: "Voltar",
          onNextClick: next,
          onPrevClick: previous,
          onCloseClick: () => postpone(),
          onPopoverRender: (popover) => {
            popover.closeButton.setAttribute(
              "aria-label",
              isTour ? "Continuar depois" : "Fechar guia",
            );
            popover.closeButton.title = isTour ? "Continuar depois" : "Fechar guia";
            const head = document.createElement("div");
            head.className = "cq-guide-progress";
            const label = document.createElement("span");
            label.textContent = isTour
              ? progressLabel(steps, index)
              : `Guia da página · ${index + 1} de ${steps.length}`;
            const bar = document.createElement("span");
            bar.className = "cq-guide-bar";
            bar.style.setProperty("--cq-progress", `${((index + 1) / steps.length) * 100}%`);
            head.append(label, bar);
            popover.wrapper.prepend(head);
            if (isTour) {
              const later = document.createElement("button");
              later.type = "button";
              later.className = "cq-guide-later";
              later.textContent = "Continuar depois";
              later.addEventListener("click", () => postpone());
              popover.footerButtons.prepend(later);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ensureDriver, finishTour, index, mode, navigate, postpone, save, steps]);

  // Arrow keys move the guide (driver.js ignores them outside its own drive() mode).
  useEffect(() => {
    if (mode !== "tour" && mode !== "page") return;
    const onKey = (event: KeyboardEvent) => {
      const action = guideKeyAction(event.key);
      if (!action || !actionsRef.current) return;
      event.preventDefault();
      actionsRef.current[action]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  useEffect(() => () => closeDriver(), [closeDriver]);

  const startTour = useCallback(() => {
    if (!tourSteps.length) return;
    closeDriver();
    setSteps(tourSteps);
    setIndex(guide?.completedAt ? 0 : resumeIndex(guide?.step ?? 0, tourSteps.length));
    setMode("welcome");
  }, [closeDriver, guide, tourSteps]);

  const startPageGuide = useCallback(() => {
    // The page is already rendered: keep only balloons whose button is on screen right now, so
    // "N de M" is honest and no step waits for something that will not appear.
    const available = availableSteps(currentPageSteps, (target) => Boolean(resolveTarget(target)));
    if (!available.length) return;
    closeDriver();
    setSteps(available);
    setIndex(0);
    setMode("page");
  }, [closeDriver, currentPageSteps]);

  const value = useMemo<GuideValue>(
    () => ({
      startTour,
      startPageGuide,
      hasPageGuide: currentPageSteps.length > 0,
      running: mode !== "idle",
    }),
    [currentPageSteps.length, mode, startPageGuide, startTour],
  );

  const firstName = usuario?.name.split(" ")[0] ?? "";
  const welcomeVariant: WelcomeVariant = guide?.completedAt
    ? "replay"
    : guide && guide.step > 0 && index > 0
      ? "resume"
      : "first";
  return (
    <GuideContext.Provider value={value}>
      {children}
      {mode === "welcome" && (
        <GuideWelcome
          name={firstName}
          variant={welcomeVariant}
          onStart={() => setMode("tour")}
          onRestart={() => {
            setIndex(0);
            setMode("tour");
          }}
          onLater={postpone}
        />
      )}
      {mode === "finish" && (
        <GuideFinish
          steps={steps}
          onClose={() => {
            setMode("idle");
            void navigate({ to: "/dashboard" });
          }}
        />
      )}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  const value = useContext(GuideContext);
  if (!value) throw new Error("GuideProvider ausente");
  return value;
}
