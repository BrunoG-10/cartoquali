import { afterEach, describe, expect, it, vi } from "vitest";
import { clearGuidePostponed, isGuidePostponed, markGuidePostponed } from "./postponed";

function stubStorage(storage: Partial<Storage>) {
  vi.stubGlobal("window", { sessionStorage: storage });
}

afterEach(() => vi.unstubAllGlobals());

describe("guide postponed flag", () => {
  it("remembers 'Continuar depois' until cleared (sign-in / sign-out)", () => {
    const data = new Map<string, string>();
    stubStorage({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    });
    expect(isGuidePostponed()).toBe(false);
    markGuidePostponed();
    expect(isGuidePostponed()).toBe(true);
    clearGuidePostponed();
    expect(isGuidePostponed()).toBe(false);
  });

  it("never throws when storage is blocked (private mode)", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    stubStorage({ getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => markGuidePostponed()).not.toThrow();
    expect(isGuidePostponed()).toBe(false);
    expect(() => clearGuidePostponed()).not.toThrow();
  });
});
