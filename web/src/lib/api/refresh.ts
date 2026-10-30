import { ACCESS_COOKIE, API_URL, BACKEND_TIMEOUT_MS, REFRESH_COOKIE } from "./config";
import { readSetCookies, cookieHeader, type CookieToSet } from "./cookies";
import { ApiError, ErrorCode, makeErrorShape, networkError, parseApiError } from "./error";

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  /** The raw cookies the backend set, ready to be forwarded to the browser. */
  cookies: CookieToSet[];
}

/**
 * The backend ROTATES the refresh token: the old one stops working the moment a refresh succeeds.
 * Several requests (parallel server fetches, prefetches, other tabs) may hold the same old token at
 * once, so every refresh in this process goes through here and is:
 *   1. single-flight  - concurrent callers share one backend call, and
 *   2. cached briefly - a caller arriving within GRACE_MS with the same old token gets the same result
 *      instead of a 401 (this also covers server components, which can't write cookies themselves:
 *      the proxy picks the cached result up on the next request and sets the cookies then).
 *
 * The cache lives on globalThis because the proxy and the server runtime may load separate module copies.
 * It is per Node process; with several instances put a shared store (e.g. Redis) behind this function.
 */
const GRACE_MS = 60_000;

type Entry = { at: number; promise: Promise<RefreshResult | null> };
const g = globalThis as typeof globalThis & { __authRefreshCache?: Map<string, Entry> };
const cache: Map<string, Entry> = (g.__authRefreshCache ??= new Map());

function prune(now: number) {
  for (const [key, entry] of cache) {
    if (now - entry.at >= GRACE_MS) cache.delete(key);
  }
}

/**
 * Returns the new session, or `null` when the refresh token is invalid/expired.
 * Throws ApiError for network problems and backend failures (callers must NOT log the user out for those).
 */
export function refreshSession(refreshToken: string): Promise<RefreshResult | null> {
  const now = Date.now();
  prune(now);

  const hit = cache.get(refreshToken);
  if (hit) return hit.promise;

  const promise = callBackendRefresh(refreshToken);
  cache.set(refreshToken, { at: now, promise });
  // Don't remember failures: an invalid token stays invalid, and network errors should be retryable.
  promise.then(
    (result) => {
      if (!result) cache.delete(refreshToken);
    },
    () => cache.delete(refreshToken),
  );

  return promise;
}

async function callBackendRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const path = "/auth/refresh";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        cookie: cookieHeader({ [REFRESH_COOKIE]: refreshToken }),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch {
    throw networkError(path);
  }

  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw await parseApiError(res);

  const cookies = readSetCookies(res.headers);
  const accessToken = cookies.find((c) => c.name === ACCESS_COOKIE)?.value;
  const newRefreshToken = cookies.find((c) => c.name === REFRESH_COOKIE)?.value;

  if (!accessToken || !newRefreshToken) {
    throw new ApiError(
      makeErrorShape(502, ErrorCode.INVALID_RESPONSE, "پاسخ رفرش توکن معتبر نیست.", path),
    );
  }

  return { accessToken, refreshToken: newRefreshToken, cookies };
}
