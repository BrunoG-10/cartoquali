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
import { buildTour, pageGuide, progressLabel, resolveTarget, resumeIndex } from "@/lib/guide/plan";
import { GuideFinish } from "./guide-finish";
import { GuideWelcome } from "./guide-welcome";

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
const TARGET_TIMEOUT_MS = 4000;

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
  const directionRef = useRef<1 | -1>(1);

  const tourSteps = useMemo(() => buildTour(currentRole), [currentRole]);
  const currentPageSteps = useMemo(() => pageGuide(pathname, currentRole), [pathname, currentRole]);

  const closeDriver = useCallback(() => {
    closingRef.current = true;
    driverRef.current?.destroy();
    driverRef.current = null;
    closingRef.current = false;
    expectedPathRef.current = null;
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
    closeDriver();
    setMode("idle");
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
    if (!tourSteps.length) return;
    autoOpenedRef.current = true;
    setSteps(tourSteps);
    setIndex(resumeIndex(guide.step, tourSteps.length));
    setMode("welcome");
  }, [guide, status, tourSteps]);

  // Clicking a menu link mid-tour counts as "Continuar depois".
  useEffect(() => {
    const expected = expectedPathRef.current;
    if ((mode === "tour" || mode === "page") && expected && !pathname.startsWith(expected))
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
    if (!pathnameRef.current.startsWith(step.page)) void navigate({ to: step.page });

    void waitForTarget(step.target).then((element) => {
      if (cancelled) return;
      // Page guides skip balloons whose button is not on this screen; the full tour centers them.
      if (!element && step.target && !isTour) {
        const next = index + directionRef.current;
        if (next >= 0 && next < steps.length) setIndex(next);
        else postpone();
        return;
      }
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
      driverRef.current.highlight({
        ...(element ? { element } : {}),
        popover: {
          title: step.title,
          description: step.text,
          side: "bottom",
          align: "start",
          showButtons: index === 0 ? ["next", "close"] : ["previous", "next", "close"],
          nextBtnText: isLast ? (isTour ? "Concluir" : "Entendi") : "Próximo",
          prevBtnText: "Voltar",
          onNextClick: () => {
            directionRef.current = 1;
            if (!isLast) setIndex(index + 1);
            else if (isTour) finishTour();
            else postpone();
          },
          onPrevClick: () => {
            directionRef.current = -1;
            if (index > 0) setIndex(index - 1);
          },
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
  }, [finishTour, index, mode, navigate, postpone, steps]);

  useEffect(() => () => closeDriver(), [closeDriver]);

  const startTour = useCallback(() => {
    if (!tourSteps.length) return;
    closeDriver();
    setSteps(tourSteps);
    setIndex(guide?.completedAt ? 0 : resumeIndex(guide?.step ?? 0, tourSteps.length));
    setMode("welcome");
  }, [closeDriver, guide, tourSteps]);

  const startPageGuide = useCallback(() => {
    if (!currentPageSteps.length) return;
    closeDriver();
    directionRef.current = 1;
    setSteps(currentPageSteps);
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
  const resuming = Boolean(guide && !guide.completedAt && guide.step > 0);
  return (
    <GuideContext.Provider value={value}>
      {children}
      {mode === "welcome" && (
        <GuideWelcome
          name={firstName}
          resuming={resuming && index > 0}
          onStart={() => {
            directionRef.current = 1;
            setMode("tour");
          }}
          onRestart={() => {
            directionRef.current = 1;
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
