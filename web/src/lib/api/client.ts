import { ApiError, isApiError, networkError, parseApiError } from "./error";
import { isAuthPath, parseSuccess, prepareRequest, type ApiRequestInit, type PreparedRequest } from "./request";

/**
 * Browser-side API client. It never talks to the backend directly: every call goes to the
 * same-origin BFF (`/api/bff/*`), which attaches the httpOnly cookies and forwards the request.
 * Tokens therefore never touch JavaScript, and no CORS is involved.
 */
const BFF_BASE = "/api/bff";

let sessionExpiredHandler: () => void = () => {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
};

/** Override what happens when the session can't be refreshed (default: redirect to /login). */
export function setSessionExpiredHandler(handler: () => void) {
  sessionExpiredHandler = handler;
}

async function send(req: PreparedRequest): Promise<Response> {
  try {
    return await fetch(`${BFF_BASE}${req.path}`, {
      cache: "no-store",
      ...req.rest,
      credentials: "same-origin",
      headers: req.headers,
      body: req.body,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e; // caller cancelled
    throw networkError(req.path);
  }
}

// Single-flight: concurrent 401s share ONE refresh call (the refresh token is rotated server-side).
let refreshInFlight: Promise<boolean> | null = null;

function refreshOnClient(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BFF_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        return res.ok; // the new cookies were set by this response's Set-Cookie headers
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Client-side API call.
 *
 *   1. call the endpoint through the BFF
 *   2. on 401, call the refresh endpoint through the BFF
 *   3. call the endpoint again
 *
 * Throws ApiError (standard error format) for every failure.
 */
export async function clientFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const req = prepareRequest(path, init);

  // 1) main call
  let res = await send(req);

  // 2) refresh on 401 (never for /auth/* endpoints themselves)
  if (res.status === 401 && !isAuthPath(req.path)) {
    if (await refreshOnClient()) {
      // 3) retry with the new cookies
      res = await send(req);
    }
    if (res.status === 401) sessionExpiredHandler();
  }

  if (!res.ok) throw await parseApiError(res);
  return parseSuccess<T>(res);
}

export { ApiError, isApiError };
