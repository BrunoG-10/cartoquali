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

// Same-origin scripts (app bundle and the host's injected ones), Google Fonts and the Supabase
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
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
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
