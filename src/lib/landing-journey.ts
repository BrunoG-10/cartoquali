// Pure math behind the landing page's story chapter: everything drawn is a function of scroll.

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** 0 before `start`, 1 after `end`, eased in between. */
export function ramp(value: number, start: number, end: number) {
  const x = clamp((value - start) / (end - start));
  return x * x * (3 - 2 * x);
}

/** Interpolates angles along the short way round. */
export function mixAngle(from: number, to: number, amount: number) {
  const turn = Math.PI * 2;
  const delta = ((((to - from + Math.PI) % turn) + turn) % turn) - Math.PI;
  return from + delta * amount;
}

/** How far through the pinned chapter the visitor is: 0 when it reaches the top, 1 when it leaves. */
export function chapterProgress(top: number, height: number, viewportHeight: number) {
  const travel = height - viewportHeight;
  return travel <= 0 ? 0 : clamp(-top / travel);
}

/** Where each caption begins and ends along the story. */
export const storyBeats = [
  { start: 0, end: 0.25 },
  { start: 0.25, end: 0.51 },
  { start: 0.51, end: 0.73 },
  { start: 0.73, end: 1 },
] as const;

/** Opacity of each caption, crossfading so that only one is ever readable. */
export function captionOpacity(index: number, story: number) {
  const beat = storyBeats[index];
  if (!beat) return 0;
  const fade = 0.018;
  const fadeIn = index === 0 ? 1 : ramp(story, beat.start, beat.start + fade);
  const fadeOut = index === storyBeats.length - 1 ? 1 : 1 - ramp(story, beat.end - fade, beat.end);
  return fadeIn * fadeOut;
}

/** Value along eased keyframes `[at, value]`, sorted by `at`; holds the ends. */
export function keyed(keys: ReadonlyArray<readonly [number, number]>, at: number) {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return 0;
  if (at <= first[0]) return first[1];
  if (at >= last[0]) return last[1];
  const nextIndex = keys.findIndex(([keyAt]) => keyAt > at);
  const before = keys[nextIndex - 1] ?? first;
  const after = keys[nextIndex] ?? last;
  return mix(before[1], after[1], ramp(at, before[0], after[0]));
}

export const THIGH = 0.44;
export const SHIN = 0.43;
export const FOOT_HEIGHT = 0.07;
const HEEL_RISE = 0.13;

export type Leg = { hip: number; knee: number; ankle: number };

/**
 * One leg of the walk cycle, in radians. `phase` advances with the distance walked, and the foot is
 * furthest forward at sin(phase) = 1: the knee folds during the swing, gives slightly when the foot
 * lands, the heel lifts at push-off and the toes rise just before the heel strikes.
 */
export function walkLeg(phase: number): Leg {
  const hip = 0.06 + 0.4 * Math.sin(phase);
  const swing = Math.max(0, Math.cos(phase + 0.45)) ** 2;
  const landing = Math.max(0, Math.cos(phase - 2.1)) ** 4;
  const knee = 0.08 + 0.92 * swing + 0.16 * landing;
  const pushOff = Math.max(0, Math.cos(phase + 1.4)) ** 3;
  const toesUp = Math.max(0, Math.cos(phase - 1.3)) ** 4;
  return { hip, knee, ankle: 0.55 * pushOff - 0.28 * toesUp };
}

/** Hip height that keeps the lower of both feet on the floor, so the body rises and falls by itself. */
export function hipHeight(left: Leg, right: Leg) {
  const reach = ({ hip, knee, ankle }: Leg) =>
    THIGH * Math.cos(hip) +
    SHIN * Math.cos(hip - knee) +
    FOOT_HEIGHT +
    HEEL_RISE * Math.sin(Math.max(0, ankle));
  return Math.max(reach(left), reach(right));
}
