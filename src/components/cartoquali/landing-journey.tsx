import { useEffect, useRef, useState } from "react";
import { captionOpacity, chapterProgress } from "@/lib/landing-journey";
import { cn } from "@/lib/utils";

// The story chapter: one pinned 3D shot under one caption at a time, so the page's own sections are
// never interrupted. Without WebGL, on data saver or with reduced motion it becomes a plain list.

const journeyBeats = [
  {
    title: "Ela chega ao cartório.",
    text: "Toda avaliação começa com alguém que precisava de um serviço.",
  },
  {
    title: "Espera ser chamada.",
    text: "Cada minuto de espera forma uma opinião. Sem perguntar, o cartório não fica sabendo.",
  },
  {
    title: "Recebe o serviço.",
    text: "Saiu satisfeita e, como quase todo mundo, iria embora sem dizer nada.",
  },
  {
    title: "E conta como foi, pelo QR Code.",
    text: "Sem aplicativo e sem cadastro, antes de sair. A opinião dela agora chega à gestão.",
  },
] as const;

/** The closing frame, shown still when the visitor prefers reduced motion. */
const STILL_STORY = 0.86;

function whenIdle() {
  return new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    } else {
      setTimeout(resolve, 300);
    }
  });
}

function supportsWebgl() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

function prefersLightPage() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

export function LandingJourney() {
  const chapterRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<Array<HTMLLIElement | null>>([]);
  const [mode, setMode] = useState<"film" | "still" | "list">("film");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canDraw = supportsWebgl() && !prefersLightPage();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chosen = !canDraw ? "list" : reduced ? "still" : "film";
    setMode(chosen);
    if (chosen === "list") return;

    const canvas = canvasRef.current;
    const chapter = chapterRef.current;
    if (!canvas || !chapter) return;

    let cancelled = false;
    let cleanup = () => {};

    // Waits for a quiet moment after the page opens, so the 3D never competes with the first paint.
    void whenIdle()
      .then(() => import("./journey-scene"))
      .then(({ createJourneyScene }) =>
        document.fonts
          .load('700 40px "Source Serif 4"')
          .catch(() => undefined)
          .then(() => createJourneyScene(canvas))
          .then((scene) => {
            if (cancelled) {
              scene.dispose();
              return;
            }
            setReady(true);
            if (chosen === "still") {
              scene.setStory(STILL_STORY);
              scene.renderOnce();
              cleanup = () => scene.dispose();
              return;
            }

            let frame = 0;
            const sync = () => {
              frame = 0;
              const box = chapter.getBoundingClientRect();
              const story = chapterProgress(box.top, box.height, window.innerHeight);
              scene.setStory(story);
              captionsRef.current.forEach((caption, index) => {
                if (!caption) return;
                const opacity = captionOpacity(index, story);
                caption.style.opacity = opacity.toFixed(3);
                caption.style.transform = `translateY(${((1 - opacity) * 10).toFixed(1)}px)`;
                caption.style.visibility = opacity < 0.01 ? "hidden" : "visible";
              });
              barRef.current?.style.setProperty("transform", `scaleX(${story.toFixed(4)})`);
            };
            const request = () => {
              if (!frame) frame = requestAnimationFrame(sync);
            };
            const watcher = new IntersectionObserver(
              ([entry]) => {
                if (entry?.isIntersecting) scene.start();
                else scene.stop();
              },
              { rootMargin: "20% 0px" },
            );
            watcher.observe(chapter);
            window.addEventListener("scroll", request, { passive: true });
            window.addEventListener("resize", request);
            sync();
            cleanup = () => {
              cancelAnimationFrame(frame);
              watcher.disconnect();
              window.removeEventListener("scroll", request);
              window.removeEventListener("resize", request);
              scene.dispose();
            };
          }),
      );

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const film = mode === "film";
  return (
    <section
      ref={chapterRef}
      aria-labelledby="historia-titulo"
      className={cn("relative print:h-auto", film && "h-[380svh]")}
    >
      <h2 id="historia-titulo" className="sr-only">
        A visita de uma cliente ao cartório
      </h2>
      <div
        className={cn(
          "overflow-hidden print:hidden",
          film ? "sticky top-0 h-svh" : mode === "still" ? "relative h-[70svh]" : "hidden",
        )}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 block size-full transition-opacity duration-700 motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
        {/* The stage dissolves into the page above and below, so there is no visible edge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background to-transparent"
        />
        {/* Keeps the caption readable without dimming the rest of the shot. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-background via-background/80 to-transparent lg:right-auto lg:h-96 lg:w-[46rem] lg:bg-[radial-gradient(ellipse_at_bottom_left,var(--background)_35%,transparent_72%)] lg:from-transparent lg:via-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent lg:h-20"
        />
      </div>
      {film ? (
        <div className="pointer-events-none sticky top-0 mt-[-100svh] flex h-svh items-end px-4 pb-24 sm:px-6 sm:pb-10 lg:px-8 print:hidden">
          <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px]">
            <div className="max-w-md">
              <ol className="relative h-32 sm:h-28">
                {journeyBeats.map(({ title, text }, index) => (
                  <li
                    key={title}
                    ref={(element) => {
                      captionsRef.current[index] = element;
                    }}
                    style={index === 0 ? undefined : { opacity: 0, visibility: "hidden" }}
                    className="absolute inset-x-0 bottom-0"
                  >
                    <p className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
                      {title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/80 sm:text-base">{text}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-px flex-1 overflow-hidden bg-foreground/20">
                  <div
                    ref={barRef}
                    className="h-full origin-left scale-x-0 bg-primary"
                    aria-hidden="true"
                  />
                </div>
                <a
                  href="#como-funciona"
                  className="pointer-events-auto rounded text-xs font-semibold text-foreground/75 underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Pular a história
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ol className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8 2xl:max-w-[1600px]">
          {journeyBeats.map(({ title, text }) => (
            <li key={title}>
              <p className="font-display text-xl font-semibold leading-snug">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
