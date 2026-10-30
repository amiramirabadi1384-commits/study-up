import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, API_URL, BACKEND_TIMEOUT_MS } from "@/lib/api/config";
import { cookieHeader } from "@/lib/api/cookies";
import { assertSameOrigin, errorResponse } from "@/lib/api/bff";
import { ErrorCode } from "@/lib/api/error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

const DROP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding", // fetch() already decompressed the body
  "content-length",
  "upgrade",
  "set-cookie", // re-added below, one by one
]);

/**
 * Generic Backend-For-Frontend proxy: /api/bff/<anything> -> API_URL/<anything>
 *  - forwards ONLY the access-token cookie (refresh token never leaves /api/bff/auth/refresh)
 *  - passes status, body and Set-Cookie headers back untouched, so the backend's standard error
 *    format reaches the client as-is and login/verify cookies land in the browser
 */
async function forward(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { path } = await params;
  const reqPath = `/api/bff/${path.join("/")}`;

  const originError = assertSameOrigin(request, reqPath);
  if (originError) return originError;

  // Path-traversal / SSRF guard: the target must stay under API_URL.
  const segments = path.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  if (segments.some((s) => s === "" || s === "." || s === ".." || /[\\/]/.test(s))) {
    return errorResponse(400, ErrorCode.BAD_REQUEST, "مسیر درخواست نامعتبر است.", reqPath);
  }

  const target = `${API_URL}/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers({ accept: request.headers.get("accept") ?? "application/json" });
  for (const name of ["content-type", "accept-language"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (access) headers.set("cookie", cookieHeader({ [ACCESS_COOKIE]: access }));

  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > 0) body = buffer;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS * 2),
    });
  } catch {
    return errorResponse(502, ErrorCode.NETWORK_ERROR, "ارتباط با سرور برقرار نشد.", reqPath);
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE_HEADERS.has(key.toLowerCase())) out.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);
  out.set("cache-control", "no-store");

  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
