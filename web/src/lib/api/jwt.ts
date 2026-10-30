/** Decodes (does NOT verify) a JWT payload. Used only to read `exp`. Works in any runtime. */
export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
): T | null {
  const part = token.split(".")[1];
  if (!part) return null;

  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** True if the token exists and is still valid for at least `leewayMs`. */
export function isTokenFresh(token: string | null | undefined, leewayMs = 0, now = Date.now()): boolean {
  if (!token) return false;
  const exp = decodeJwtPayload<{ exp?: number }>(token)?.exp;
  return typeof exp === "number" && exp * 1000 - now > leewayMs;
}
