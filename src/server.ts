import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Same-origin scripts (app bundle and the host's injected ones), self-hosted fonts and the Supabase
// project. 'unsafe-inline' stays for scripts because SSR streams inline hydration data; the policy
// still blocks scripts and data exfiltration to any other origin. frame-ancestors stops the panel
// from being embedded by another site (clickjacking); only Lovable's editor, which previews the app
// in a frame, may embed it. No X-Frame-Options: it cannot allow that one origin.
function contentSecurityPolicy() {
  const supabase = process.env["SUPABASE_URL"] ?? "";
  const realtime = supabase.replace(/^https:/, "wss:");
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${supabase} ${realtime}`.trim(),
    "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const SECURITY_HEADERS: Record<string, () => string> = {
  "Content-Security-Policy": contentSecurityPolicy,
  "X-Content-Type-Options": () => "nosniff",
  "Referrer-Policy": () => "strict-origin-when-cross-origin",
  // The app uses none of these; the public survey must not be able to ask for them either.
  "Permissions-Policy": () => "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

function withSecurityHeaders(response: Response): Response {
  // The dev server injects its own inline/HMR code; the policy applies to the published build.
  if (import.meta.env.DEV) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    if (!headers.has(name)) headers.set(name, value());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Uptime monitors (UptimeRobot, Better Stack…) poll this path. It answers 200 when the app and
// Supabase respond and 503 otherwise. It uses only the public key against Supabase's own health
// endpoint, so it reads no tenant data and never touches the service-role key. The upstream result
// is reused for a few seconds so the public path cannot be used to flood Supabase.
const HEALTH_PATH = "/api/health";
const HEALTH_CACHE_MS = 15_000;
let lastHealth: { ok: boolean; at: number } | undefined;

async function supabaseIsHealthy() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function healthResponse(): Promise<Response> {
  const headers = { "content-type": "application/json", "cache-control": "no-store, max-age=0" };
  if (!lastHealth || Date.now() - lastHealth.at > HEALTH_CACHE_MS)
    lastHealth = { ok: await supabaseIsHealthy(), at: Date.now() };
  if (!lastHealth.ok) console.error("[health] Supabase check failed");
  return new Response(JSON.stringify({ status: lastHealth.ok ? "ok" : "degraded" }), {
    status: lastHealth.ok ? 200 : 503,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    if (new URL(request.url).pathname === HEALTH_PATH && ["GET", "HEAD"].includes(request.method))
      return withSecurityHeaders(await healthResponse());
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
