import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_GUIDES, TOUR_STEPS } from "./content";

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return name.endsWith(".tsx") ? [full] : [];
  });
}

// Every balloon must point at something that exists on screen; a renamed or removed
// data-tour would otherwise silently turn into a centered balloon.
describe("guide targets", () => {
  it("are all marked with data-tour in a component", () => {
    const source = tsxFiles(join(process.cwd(), "src", "components"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const targets = new Set(
      [...TOUR_STEPS, ...Object.values(PAGE_GUIDES).flat()]
        .map((step) => step.target)
        .filter((target): target is string => target !== null),
    );
    // data-tour="x" on DOM elements, tour="x" on GlassPanel (which renders data-tour), or the
    // quoted id in a component that builds data-tour from data (the sidebar groups).
    const missing = [...targets].filter((target) => !source.includes(`"${target}"`));
    expect(missing).toEqual([]);
  });
});
