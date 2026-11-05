// Pure math behind the landing page's scroll story: what is drawn is a function of scroll alone.

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** 0 before `start`, 1 after `end`, eased in between. */
export function ramp(phase: number, start: number, end: number) {
  const x = clamp((phase - start) / (end - start));
  return x * x * (3 - 2 * x);
}

export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

export type Pose = {
  x: number;
  thighF: number;
  shinF: number;
  thighB: number;
  shinB: number;
  armF: number;
  foreF: number;
  armB: number;
  foreB: number;
  lean: number;
  head: number;
  /** 0 standing still, 1 walking; the stride is derived from `x`. */
  walk: number;
};

export const standing: Pose = {
  x: 0,
  thighF: -2,
  shinF: 2,
  thighB: 2,
  shinB: 0,
  armF: 4,
  foreF: -8,
  armB: -4,
  foreB: -6,
  lean: 0,
  head: 0,
  walk: 0,
};

export type Keyframe = { at: number; pose: Partial<Pose> };

/** Eased interpolation over keyframes sorted by `at`; each one inherits `standing` for what it omits. */
export function poseAt(track: Keyframe[], phase: number): Pose {
  const first = track[0];
  const last = track[track.length - 1];
  if (!first || !last) return standing;
  if (phase <= first.at) return { ...standing, ...first.pose };
  if (phase >= last.at) return { ...standing, ...last.pose };
  const nextIndex = track.findIndex((frame) => frame.at > phase);
  const before = track[nextIndex - 1] ?? first;
  const after = track[nextIndex] ?? last;
  const from = { ...standing, ...before.pose };
  const to = { ...standing, ...after.pose };
  const eased = ramp(phase, before.at, after.at);
  // Walking keeps a steady pace so feet do not skate at the start and end of a stretch.
  const linear = clamp((phase - before.at) / (after.at - before.at));
  const keysOf = Object.keys(standing) as Array<keyof Pose>;
  const result = { ...standing };
  for (const key of keysOf) {
    const amount = key === "x" && from.walk > 0 && to.walk > 0 ? linear : eased;
    result[key] = mix(from[key], to[key], amount);
  }
  return result;
}

export const THIGH = 62;
export const SHIN = 62;
export const SHOE = 8;
const STRIDE = 190;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Adds the walk cycle on top of the pose. */
export function withStride(pose: Pose): Pose {
  if (pose.walk <= 0) return pose;
  const angle = (pose.x * 2 * Math.PI) / STRIDE;
  const swing = Math.sin(angle) * 24 * pose.walk;
  const kneeF = Math.max(0, Math.cos(angle)) * 34 * pose.walk;
  const kneeB = Math.max(0, -Math.cos(angle)) * 34 * pose.walk;
  return {
    ...pose,
    thighF: pose.thighF - swing,
    shinF: pose.shinF + kneeF,
    thighB: pose.thighB + swing,
    shinB: pose.shinB + kneeB,
    armF: pose.armF + swing * 0.7,
    armB: pose.armB - swing * 0.7,
  };
}

/** Height of the hip above the ground, so the lowest foot always touches it. */
export function hipHeight(pose: Pose) {
  const reach = (thigh: number, shin: number) =>
    THIGH * Math.cos(toRadians(thigh)) + SHIN * Math.cos(toRadians(thigh + shin));
  return Math.max(reach(pose.thighF, pose.shinF), reach(pose.thighB, pose.shinB)) + SHOE;
}

export type FigurePart =
  | "root"
  | "thighF"
  | "shinF"
  | "thighB"
  | "shinB"
  | "torso"
  | "head"
  | "armF"
  | "foreF"
  | "armB"
  | "foreB";

export const SHOULDER_Y = -78;
export const UPPER_ARM = 46;

/** SVG transforms of every joint for a pose standing on `ground`. */
export function figureTransforms(rawPose: Pose, ground: number): Record<FigurePart, string> {
  const pose = withStride(rawPose);
  const rotate = (degrees: number) => `rotate(${degrees.toFixed(2)})`;
  const joint = (x: number, y: number, degrees: number) =>
    `translate(${x} ${y}) rotate(${degrees.toFixed(2)})`;
  return {
    root: `translate(${pose.x.toFixed(2)} ${(ground - hipHeight(pose)).toFixed(2)})`,
    thighF: rotate(pose.thighF),
    shinF: joint(0, THIGH, pose.shinF),
    thighB: rotate(pose.thighB),
    shinB: joint(0, THIGH, pose.shinB),
    torso: rotate(pose.lean),
    head: joint(3, -92, pose.head),
    armF: joint(2, SHOULDER_Y, pose.armF),
    foreF: joint(0, UPPER_ARM, pose.foreF),
    armB: joint(-2, SHOULDER_Y, pose.armB),
    foreB: joint(0, UPPER_ARM, pose.foreB),
  };
}

export type BandBox = { top: number; height: number };

/** How far a band has crossed the viewport: 0 when entering at the bottom, 1 when leaving at the top. */
export function bandProgress(band: BandBox, viewportHeight: number) {
  return (viewportHeight - band.top) / (viewportHeight + band.height);
}

/** Where she is when the street first shows: already on her way, so the page opens on movement. */
export const HERO_PHASE = 0.55;

export type JourneyTarget = { beat: number; phase: number } | null;

/** Chooses the scene to draw from the transparent windows in page order; none visible, none drawn. */
export function journeyTarget(bands: BandBox[], viewportHeight: number): JourneyTarget {
  for (const [beat, band] of bands.entries()) {
    const progress = bandProgress(band, viewportHeight);
    if (progress <= 0 || progress >= 1) continue;
    return { beat, phase: beat === 0 ? mix(HERO_PHASE, 1, progress) : progress };
  }
  return null;
}
