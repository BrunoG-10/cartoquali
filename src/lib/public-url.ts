const configuredBaseUrl = import.meta.env["VITE_PUBLIC_APP_URL"]?.trim().replace(/\/$/, "");

export function getPublicAppBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getEvaluationUrl(code: string) {
  const path = `/avaliar/${encodeURIComponent(code)}`;
  const baseUrl = getPublicAppBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
}