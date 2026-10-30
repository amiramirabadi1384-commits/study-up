// Server-side configuration. Do not import this from client components.

export const API_URL = (process.env.API_URL ?? "http://localhost:3001/api/v1").replace(/\/+$/, "");

/** Cookie names set by the backend (httpOnly, path "/"). */
export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

/** Refresh a little before the access token really expires. */
export const REFRESH_LEEWAY_MS = 30_000;

export const BACKEND_TIMEOUT_MS = 15_000;
