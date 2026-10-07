// Supabase redirects a failed e-mail link back with `error`/`error_code` in the hash or query.
export function recoveryLinkError(hash: string, search: string): "expired" | "invalid" | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  new URLSearchParams(search.replace(/^\?/, "")).forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  if (!params.has("error") && !params.has("error_code")) return null;
  return params.get("error_code") === "otp_expired" ? "expired" : "invalid";
}
