import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// `const call = supabase.rpc` drops `this`, so supabase-js throws at call time and the server
// function fails every time (this broke CSV export, occurrence create/update and data minimization).
describe("supabase rpc references", () => {
  it("are never detached from the client", () => {
    const dir = join(process.cwd(), "src", "lib");
    const offenders = readdirSync(dir)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .flatMap((file) =>
        readFileSync(join(dir, file), "utf8")
          .split("\n")
          .map((line, index) => ({ file, line: index + 1, text: line }))
          .filter(({ text }) => /=\s*[\w.]*supabase\.rpc\s+as\b/.test(text)),
      )
      .map(({ file, line }) => `${file}:${line}`);
    expect(offenders).toEqual([]);
  });
});
