import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/api/config";
import { toNextCookie } from "@/lib/api/cookies";
import { assertSameOrigin, clearAuthCookies, errorResponse } from "@/lib/api/bff";
import { ErrorCode, isApiError } from "@/lib/api/error";
import { refreshSession } from "@/lib/api/refresh";

export const dynamic = "force-dynamic";

const PATH = "/api/bff/auth/refresh";

/**
 * Dedicated refresh endpoint used by clientFetch. It wins over the catch-all BFF route and goes
 * through the shared single-flight refresh (see lib/api/refresh.ts), so several tabs/requests
 * refreshing at the same moment can't invalidate each other's rotated refresh token.
 */
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request, PATH);
  if (originError) return originError;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return errorResponse(401, ErrorCode.UNAUTHORIZED, "نشست شما منقضی شده است. دوباره وارد شوید.", PATH);
  }

  try {
    const session = await refreshSession(refreshToken);

    if (!session) {
      return clearAuthCookies(
        errorResponse(401, ErrorCode.UNAUTHORIZED, "نشست شما منقضی شده است. دوباره وارد شوید.", PATH),
      );
    }

    const res = NextResponse.json({ success: true }, { headers: { "cache-control": "no-store" } });
    for (const cookie of session.cookies) res.cookies.set(toNextCookie(cookie));
    return res;
  } catch (e) {
    if (isApiError(e)) return errorResponse(e.statusCode, e.code, e.message, PATH);
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, "خطای داخلی سرور", PATH);
  }
}
