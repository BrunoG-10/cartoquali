const rawConfiguredBaseUrl = import.meta.env["VITE_PUBLIC_APP_URL"]?.trim().replace(/\/$/, "");

function normalizePublicOrigin(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.pathname !== "/" || url.search || url.hash) return "";
    if (url.protocol !== "https:" && url.hostname !== "localhost") return "";
    return url.origin;
  } catch {
    return "";
  }
}

const configuredBaseUrl = normalizePublicOrigin(rawConfiguredBaseUrl);

export function getPublicAppBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl;
  if (typeof window !== "undefined") return normalizePublicOrigin(window.location.origin);
  return "";
}

/**
 * Where invitation and password-recovery e-mails send people: always the official address
 * (never whichever host the administrator happened to be on). Invitations are flagged so the
 * page can greet a new user instead of talking about a "new" password.
 */
export function getPasswordSetupUrl(kind: "invite" | "recovery") {
  const path = kind === "invite" ? "/reset-password?origem=convite" : "/reset-password";
  return `${getPublicAppBaseUrl()}${path}`;
}

export function getEvaluationUrl(code: string) {
  const path = `/avaliar/${encodeURIComponent(code)}`;
  const baseUrl = getPublicAppBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
}
