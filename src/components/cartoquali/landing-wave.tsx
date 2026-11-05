import { useEffect, useRef } from "react";

// The band of gold light behind the hero: fine vertical strokes rising and falling in slow waves,
// pushed along by the visitor's scroll. Drawn in 2D, on our own canvas, and only while on screen.

const BAR_GAP = 7;
const FRAME_MS = 1000 / 30;

function barSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = 4;
  sprite.height = 256;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "rgba(255, 214, 140, 0)");
    gradient.addColorStop(0.45, "rgba(255, 214, 140, 0.9)");
    gradient.addColorStop(0.72, "rgba(217, 165, 84, 0.55)");
    gradient.addColorStop(1, "rgba(120, 88, 40, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 256);
  }
  return sprite;
}

export function LightWave({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const sprite = barSprite();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;
    let visible = true;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      const drift = time * 0.00016 + window.scrollY * 0.0016;
      const swell = 1 + Math.min(0.35, window.scrollY * 0.0005);
      const count = Math.ceil(width / BAR_GAP);
      for (let i = 0; i < count; i++) {
        const x = i / count;
        const wave =
          0.5 +
          0.28 * Math.sin(x * 7.5 + drift * 3) +
          0.15 * Math.sin(x * 17 - drift * 4.5) +
          0.07 * Math.sin(x * 41 + drift * 7);
        // Strongest towards the centre, so the headline's sides stay calm.
        const envelope = Math.sin(Math.PI * x) ** 0.8;
        const level = Math.max(0, wave) * envelope;
        const barHeight = height * (0.18 + 0.82 * level) * swell;
        ctx.globalAlpha = 0.14 + 0.7 * level ** 1.4;
        ctx.drawImage(sprite, i * BAR_GAP, height - barHeight * 0.82, 1.5, barHeight);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      frame = requestAnimationFrame(loop);
      if (time - lastDraw < FRAME_MS) return;
      lastDraw = time;
      draw(time);
    };
    const run = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (reduced.matches) draw(0);
      else if (visible) frame = requestAnimationFrame(loop);
    };
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (reduced.matches) draw(0);
    };

    const resizer = new ResizeObserver(fit);
    resizer.observe(canvas);
    const watcher = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      run();
    });
    watcher.observe(canvas);
    reduced.addEventListener("change", run);
    fit();
    run();
    return () => {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      reduced.removeEventListener("change", run);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
