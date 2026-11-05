import { describe, expect, it } from "vitest";
import {
  HERO_PHASE,
  SHOE,
  SHIN,
  THIGH,
  bandProgress,
  hipHeight,
  journeyTarget,
  poseAt,
  ramp,
  standing,
} from "./landing-journey";

describe("ramp", () => {
  it("stays within 0 and 1 and eases between the limits", () => {
    expect(ramp(0.1, 0.2, 0.4)).toBe(0);
    expect(ramp(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(ramp(0.9, 0.2, 0.4)).toBe(1);
  });
});

describe("poseAt", () => {
  const track = [
    { at: 0, pose: { x: 0, walk: 1 } },
    { at: 0.5, pose: { x: 100, walk: 1 } },
    { at: 1, pose: { x: 100, armF: -60 } },
  ];

  it("holds the first and last keyframes outside the track", () => {
    expect(poseAt(track, -1).x).toBe(0);
    expect(poseAt(track, 2).armF).toBe(-60);
  });

  it("walks at a steady pace and eases everything else", () => {
    expect(poseAt(track, 0.1).x).toBeCloseTo(20);
    expect(poseAt(track, 0.75).armF).toBeCloseTo((standing.armF - 60) / 2);
  });
});

describe("hipHeight", () => {
  it("keeps a straight leg's foot on the ground", () => {
    const straight = { ...standing, thighF: 0, shinF: 0, thighB: 0, shinB: 0 };
    expect(hipHeight(straight)).toBeCloseTo(THIGH + SHIN + SHOE);
  });

  it("lowers the hip to the seat when sitting", () => {
    const seated = { ...standing, thighF: -90, shinF: 90, thighB: -90, shinB: 90 };
    expect(hipHeight(seated)).toBeCloseTo(SHIN + SHOE);
  });
});

describe("journeyTarget", () => {
  const viewport = 800;
  const away = { top: 5000, height: 600 };

  it("draws nothing when no window is on screen", () => {
    expect(journeyTarget([away, away], viewport)).toBeNull();
  });

  it("follows the window that is crossing the screen", () => {
    const crossing = { top: 100, height: 600 };
    const progress = bandProgress(crossing, viewport);
    expect(progress).toBeCloseTo(0.5);
    expect(journeyTarget([{ top: -2000, height: 600 }, crossing], viewport)).toEqual({
      beat: 1,
      phase: progress,
    });
  });

  it("starts the first window with her already on her way", () => {
    const entering = { top: viewport - 1, height: 600 };
    const target = journeyTarget([entering], viewport);
    expect(target?.beat).toBe(0);
    expect(target?.phase).toBeGreaterThanOrEqual(HERO_PHASE);
  });
});
