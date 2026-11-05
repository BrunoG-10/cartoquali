import { describe, expect, it } from "vitest";
import {
  FOOT_HEIGHT,
  SHIN,
  THIGH,
  captionOpacity,
  chapterProgress,
  hipHeight,
  keyed,
  mixAngle,
  ramp,
  storyBeats,
  walkLeg,
} from "./landing-journey";

describe("ramp", () => {
  it("stays within 0 and 1 and eases between the limits", () => {
    expect(ramp(0.1, 0.2, 0.4)).toBe(0);
    expect(ramp(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(ramp(0.9, 0.2, 0.4)).toBe(1);
  });
});

describe("keyed", () => {
  const keys = [
    [0.2, 1],
    [0.4, 3],
  ] as const;

  it("holds the ends and eases between keys", () => {
    expect(keyed(keys, 0)).toBe(1);
    expect(keyed(keys, 0.3)).toBeCloseTo(2);
    expect(keyed(keys, 1)).toBe(3);
  });
});

describe("mixAngle", () => {
  it("turns the short way round", () => {
    expect(mixAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
    expect(mixAngle(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});

describe("chapterProgress", () => {
  it("runs from 0 to 1 while the chapter is pinned", () => {
    expect(chapterProgress(200, 3000, 800)).toBe(0);
    expect(chapterProgress(-1100, 3000, 800)).toBeCloseTo(0.5);
    expect(chapterProgress(-9000, 3000, 800)).toBe(1);
  });

  it("does not divide by zero when the chapter fits the screen", () => {
    expect(chapterProgress(-10, 800, 800)).toBe(0);
  });
});

describe("captionOpacity", () => {
  const readable = (story: number) =>
    storyBeats.filter((_, index) => captionOpacity(index, story) > 0.5).length;

  it("shows the first caption from the start and the last until the end", () => {
    expect(captionOpacity(0, 0)).toBe(1);
    expect(captionOpacity(3, 1)).toBe(1);
  });

  it("never lets two captions be readable at once", () => {
    for (let story = 0; story <= 1; story += 0.005) expect(readable(story)).toBeLessThanOrEqual(1);
  });
});

describe("walk cycle", () => {
  it("swings the leg forward and back", () => {
    expect(walkLeg(Math.PI / 2).hip).toBeGreaterThan(0.3);
    expect(walkLeg(-Math.PI / 2).hip).toBeLessThan(-0.3);
  });

  it("bends the knee most while the foot swings through", () => {
    expect(walkLeg(-0.45).knee).toBeGreaterThan(walkLeg(Math.PI / 2).knee);
  });

  it("keeps a foot near the floor through the whole cycle", () => {
    const standing = THIGH + SHIN + FOOT_HEIGHT;
    for (let phase = 0; phase < Math.PI * 2; phase += 0.1) {
      const height = hipHeight(walkLeg(phase), walkLeg(phase + Math.PI));
      expect(height).toBeGreaterThan(standing * 0.9);
      expect(height).toBeLessThan(standing * 1.03);
    }
  });
});

describe("hipHeight", () => {
  it("rests on the seat height when sitting", () => {
    const seated = { hip: Math.PI / 2, knee: Math.PI / 2, ankle: 0 };
    expect(hipHeight(seated, seated)).toBeCloseTo(SHIN + FOOT_HEIGHT);
  });
});
