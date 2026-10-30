import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, REFRESH_LEEWAY_MS } from "@/lib/api/config";
import { mergeCookieHeader, toNextCookie, type CookieToSet } from "@/lib/api/cookies";
import { isTokenFresh } from "@/lib/api/jwt";
import { refreshSession } from "@/lib/api/refresh";
import { safeRedirectPath } from "@/lib/redirect";

/**
 * Keeps the browser's tokens and server-side rendering in sync.
 *
 * Server Components can't write cookies, so a token refreshed during rendering would never reach
 * the browser (and, because the backend rotates refresh tokens, the session would die).
 * This proxy runs BEFORE rendering on every page request and:
 *   - refreshes the session when the access token is missing/expiring,
 *   - writes the new cookies to the browser (Set-Cookie on the response),
 *   - rewrites the incoming Cookie header so the page being rendered already sees the new tokens,
 *   - guards protected routes and keeps logged-in users away from /login.
 */

const PROTECTED_PREFIXES = ["/dashboard"];
const GUEST_ONLY = ["/login"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  let newCookies: CookieToSet[] = [];
  let sessionInvalid = false;
  let backendUnavailable = false;

  // The access cookie lives 15 min and is removed by the browser on expiry, so "missing" == "expired".
  if (refresh && !isTokenFresh(access, REFRESH_LEEWAY_MS)) {
    try {
      const session = await refreshSession(refresh);
      if (session) {
        newCookies = session.cookies;
        access = session.accessToken;
      } else {
        sessionInvalid = true;
        access = undefined;
      }
    } catch {
      // Backend down / network error: keep the cookies, don't log the user out.
      backendUnavailable = true;
    }
  }

  const authenticated = isTokenFresh(access) || backendUnavailable;

  let response: NextResponse;

  if (matches(pathname, PROTECTED_PREFIXES) && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  } else if (matches(pathname, GUEST_ONLY) && authenticated) {
    const dest = new URL(safeRedirectPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);
    const url = request.nextUrl.clone();
    url.pathname = dest.pathname;
    url.search = dest.search;
    response = NextResponse.redirect(url);
  } else {
    // Forward the refreshed tokens to the page/route being rendered in this very request.
    const headers = new Headers(request.headers);
    if (newCookies.length || sessionInvalid) {
      headers.set(
        "cookie",
        mergeCookieHeader(headers.get("cookie"), newCookies, sessionInvalid ? [ACCESS_COOKIE, REFRESH_COOKIE] : []),
      );
    }
    response = NextResponse.next({ request: { headers } });
  }

  // ...and to the browser.
  for (const cookie of newCookies) response.cookies.set(toNextCookie(cookie));
  if (sessionInvalid) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }

  return response;
}

export const config = {
  // Pages only: skip API routes (the client flow handles those), Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
