import { cookies } from "next/headers";
import { ACCESS_COOKIE, API_URL, BACKEND_TIMEOUT_MS, REFRESH_COOKIE } from "./config";
import { cookieHeader, toNextCookie, type CookieToSet } from "./cookies";
import { networkError, parseApiError } from "./error";
import { refreshSession } from "./refresh";
import { isAuthPath, parseSuccess, prepareRequest, type ApiRequestInit, type PreparedRequest } from "./request";

/**
 * Persists tokens in the browser. Works in Route Handlers and Server Actions.
 * Server Components cannot write cookies: there it returns false and the proxy
 * (src/proxy.ts) keeps the browser in sync on the next request.
 */
async function persistCookies(list: CookieToSet[]): Promise<boolean> {
  try {
    const store = await cookies();
    for (const c of list) store.set(toNextCookie(c));
    return true;
  } catch {
    return false;
  }
}

async function clearAuthCookies(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(ACCESS_COOKIE);
    store.delete(REFRESH_COOKIE);
  } catch {
    /* read-only context (server component) - the proxy will clear them */
  }
}

async function callBackend(req: PreparedRequest, accessToken: string | undefined): Promise<Response> {
  const headers = new Headers(req.headers);
  // The backend authenticates from the accessToken cookie. Only that cookie is ever sent.
  if (accessToken) headers.set("cookie", cookieHeader({ [ACCESS_COOKIE]: accessToken }));
  else headers.delete("cookie");

  try {
    return await fetch(`${API_URL}${req.path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      ...req.rest,
      headers,
      body: req.body,
    });
  } catch {
    throw networkError(req.path);
  }
}

/**
 * Server-side API call (Server Components, Server Actions, Route Handlers).
 *
 *   1. call the endpoint with the access token from the request cookies
 *   2. on 401, call the refresh endpoint (single-flight, see refresh.ts)
 *   3. call the endpoint again with the new access token
 *
 * Throws ApiError (standard error format) for every failure.
 * Request bodies must be re-readable (JSON / string / FormData), not streams.
 */
export async function serverFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const req = prepareRequest(path, init);
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  // 1) main call
  let res = await callBackend(req, store.get(ACCESS_COOKIE)?.value);

  // 2) refresh on 401
  if (res.status === 401 && refreshToken && !isAuthPath(req.path)) {
    const session = await refreshSession(refreshToken);

    if (session) {
      await persistCookies(session.cookies);
      // 3) retry with the freshly issued access token
      res = await callBackend(req, session.accessToken);
    } else {
      await clearAuthCookies();
    }
  }

  if (!res.ok) throw await parseApiError(res);
  return parseSuccess<T>(res);
}
