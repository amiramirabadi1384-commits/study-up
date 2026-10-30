import { ApiError, ErrorCode, makeErrorShape } from "./error";

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  /** Plain objects/arrays are sent as JSON. FormData, strings, Blobs... are sent as-is. */
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  /** Query-string parameters; null/undefined are skipped, arrays are repeated. */
  query?: Record<string, QueryValue | QueryValue[]>;
}

export interface PreparedRequest {
  /** Path + query string, always starting with "/" */
  path: string;
  headers: Headers;
  body: BodyInit | undefined;
  rest: Omit<RequestInit, "body" | "headers">;
}

function isBodyInit(v: unknown): v is BodyInit {
  return (
    typeof v === "string" ||
    v instanceof FormData ||
    v instanceof URLSearchParams ||
    v instanceof Blob ||
    v instanceof ArrayBuffer ||
    ArrayBuffer.isView(v) ||
    (typeof ReadableStream !== "undefined" && v instanceof ReadableStream)
  );
}

export function buildPath(path: string, query?: ApiRequestInit["query"]): string {
  const [base, existing] = path.split("?");
  const params = new URLSearchParams(existing ?? "");

  for (const [key, value] of Object.entries(query ?? {})) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined && v !== null) params.append(key, String(v));
    }
  }

  const qs = params.toString();
  const normalized = base.startsWith("/") ? base : `/${base}`;
  return qs ? `${normalized}?${qs}` : normalized;
}

export function prepareRequest(path: string, init: ApiRequestInit = {}): PreparedRequest {
  const { body, query, headers: rawHeaders, ...rest } = init;
  const headers = new Headers(rawHeaders);
  if (!headers.has("accept")) headers.set("accept", "application/json");

  let finalBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isBodyInit(body)) {
      finalBody = body;
    } else {
      finalBody = JSON.stringify(body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }

  return { path: buildPath(path, query), headers, body: finalBody, rest };
}

/** Parses a successful response (JSON, text, or empty). */
export async function parseSuccess<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  if ((res.headers.get("content-type") ?? "").includes("json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(
        makeErrorShape(502, ErrorCode.INVALID_RESPONSE, "پاسخ دریافتی از سرور معتبر نیست.", res.url),
      );
    }
  }
  return text as unknown as T;
}

export function isAuthPath(path: string): boolean {
  return path.startsWith("/auth/") || path === "/auth";
}
