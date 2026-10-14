// Detects a newly published version: every build gives the entry script and the main stylesheet
// a content hash, so comparing them between the loaded page and the server says if a deploy happened.

const ENTRY = /\/assets\/(index-[A-Za-z0-9_-]+\.js)/;
const STYLES = /\/assets\/(styles-[A-Za-z0-9_-]+\.css)/;

/** "index-<hash>.js|styles-<hash>.css", or null when the page has no hashed entry. */
export function buildSignature(text: string): string | null {
  const entry = text.match(ENTRY)?.[1];
  if (!entry) return null;
  return [entry, text.match(STYLES)?.[1]].filter(Boolean).join("|");
}

export function isNewVersion(current: string | null, published: string | null): boolean {
  return Boolean(current && published && current !== published);
}

/** Signature of the version running in this tab, read from the loaded script and style URLs. */
export function loadedSignature(doc: Document): string | null {
  const urls = [
    ...doc.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]"),
  ]
    .map(
      (element) => ("src" in element && element.src) || ("href" in element && element.href) || "",
    )
    .join(" ");
  return buildSignature(urls);
}

/**
 * Signature of the version the server publishes now (a small public page, never cached).
 * Without cookies on purpose: the host pins a tab's requests to the deployment it opened with
 * (`__dpl` cookie), so a request carrying it would always answer with the old version.
 */
export async function publishedSignature(): Promise<string | null> {
  const response = await fetch(`/login?versao=${Date.now()}`, {
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) return null;
  return buildSignature(await response.text());
}
