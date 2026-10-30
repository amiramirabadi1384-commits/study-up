// Server-side cookie helpers (proxy, route handlers, server components).

export interface CookieToSet {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number; // seconds
  expires?: Date;
}

/** Parses one `Set-Cookie` header. `Domain` is dropped on purpose: cookies belong to the Next.js origin. */
export function parseSetCookieHeader(header: string): CookieToSet | null {
  const parts = header
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const first = parts.shift();
  if (!first) return null;

  const eq = first.indexOf("=");
  if (eq <= 0) return null;

  const name = first.slice(0, eq).trim();
  let value = first.slice(eq + 1).trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep raw value */
  }

  const cookie: CookieToSet = { name, value };

  for (const attr of parts) {
    const i = attr.indexOf("=");
    const key = (i === -1 ? attr : attr.slice(0, i)).trim().toLowerCase();
    const val = i === -1 ? "" : attr.slice(i + 1).trim();

    switch (key) {
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "samesite": {
        const v = val.toLowerCase();
        if (v === "lax" || v === "strict" || v === "none") cookie.sameSite = v;
        break;
      }
      case "path":
        cookie.path = val;
        break;
      case "max-age": {
        const n = Number(val);
        if (Number.isFinite(n)) cookie.maxAge = n;
        break;
      }
      case "expires": {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) cookie.expires = d;
        break;
      }
    }
  }

  return cookie;
}

export function readSetCookies(headers: Headers): CookieToSet[] {
  return headers
    .getSetCookie()
    .map(parseSetCookieHeader)
    .filter((c): c is CookieToSet => c !== null);
}

/** Shape accepted by `NextResponse.cookies.set()` and `cookies().set()`. */
export function toNextCookie(c: CookieToSet) {
  return {
    name: c.name,
    value: c.value,
    httpOnly: c.httpOnly ?? true,
    secure: c.secure,
    sameSite: c.sameSite ?? ("lax" as const),
    path: c.path ?? "/",
    maxAge: c.maxAge,
    expires: c.expires,
  };
}

/** Builds a `Cookie` request header value. */
export function cookieHeader(values: Record<string, string | undefined>): string {
  return Object.entries(values)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

/** Applies `set`/`remove` to an existing `Cookie` request header (so server components see fresh tokens). */
export function mergeCookieHeader(
  existing: string | null | undefined,
  set: CookieToSet[] = [],
  remove: string[] = [],
): string {
  const map = new Map<string, string>();

  for (const piece of (existing ?? "").split(";")) {
    const trimmed = piece.trim();
    const eq = trimmed.indexOf("=");
    if (eq > 0) map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  for (const name of remove) map.delete(name);
  for (const c of set) map.set(c.name, encodeURIComponent(c.value));

  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
