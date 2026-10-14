import { describe, expect, it } from "vitest";
import { buildSignature, isNewVersion } from "./app-version";

const html = `<link rel="stylesheet" href="/assets/styles-BdfxZr0L.css">
<link rel="modulepreload" href="/assets/link-S7LRuTfm.js">
<script type="module" src="/assets/index-CK58uNtE.js"></script>
<link rel="stylesheet" href="https://cartoquali.com.br/assets/guide-provider-CTZuBZOi.css">`;

describe("buildSignature", () => {
  it("uses the hashed entry script and main stylesheet", () => {
    expect(buildSignature(html)).toBe("index-CK58uNtE.js|styles-BdfxZr0L.css");
  });

  it("accepts absolute URLs and ignores other chunks", () => {
    expect(
      buildSignature(
        "https://cartoquali.com.br/assets/index-AAA111.js https://cartoquali.com.br/assets/styles-BBB.css /assets/root-X.js",
      ),
    ).toBe("index-AAA111.js|styles-BBB.css");
  });

  it("returns null when the page has no hashed entry (dev server, error page)", () => {
    expect(buildSignature('<script type="module" src="/src/main.tsx"></script>')).toBeNull();
    expect(buildSignature("")).toBeNull();
  });
});

describe("isNewVersion", () => {
  it("is true only when both signatures are known and differ", () => {
    expect(isNewVersion("index-A.js|styles-A.css", "index-B.js|styles-A.css")).toBe(true);
    expect(isNewVersion("index-A.js|styles-A.css", "index-A.js|styles-A.css")).toBe(false);
    expect(isNewVersion(null, "index-B.js|styles-A.css")).toBe(false);
    expect(isNewVersion("index-A.js|styles-A.css", null)).toBe(false);
  });
});
