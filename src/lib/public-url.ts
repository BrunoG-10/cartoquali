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

export function getEvaluationUrl(code: string) {
  const path = `/avaliar/${encodeURIComponent(code)}`;
  const baseUrl = getPublicAppBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
}
