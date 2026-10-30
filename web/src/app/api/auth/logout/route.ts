import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/api/bff";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/config";
import { serverFetch } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Revokes the refresh token on the backend (best effort) and always clears the browser cookies. */
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request, "/api/auth/logout");
  if (originError) return originError;

  try {
    await serverFetch("/auth/logout", { method: "POST" });
  } catch {
    /* already logged out / backend down: still clear the cookies */
  }

  // Same cookie store serverFetch may have written to, so the delete always wins.
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);

  return NextResponse.json({ success: true }, { headers: { "cache-control": "no-store" } });
}
