# Front-end (Next.js 16, App Router)

Talks to the Nest backend through a BFF, keeps httpOnly cookies in sync with server rendering via `proxy.ts`,
and surfaces every failure in the backend's standard error format.

## Run

```bash
cp .env.example .env.local     # set API_URL (backend base URL incl. /api/v1)
npm install
npm run dev                    # http://localhost:3000
```

Requires Node >= 20.9. The backend needs no CORS config for this app (browser never calls it directly).
In production the backend sets `Secure` cookies, so serve the front-end over HTTPS.

## Architecture

```
Browser ──clientFetch──▶ /api/bff/*  (Route Handler) ──▶ Backend /api/v1/*
Server Components / Actions / Route Handlers ──serverFetch──▶ Backend
Every page request ──▶ src/proxy.ts (refresh + cookie sync + route guard) ──▶ page
```

| File | Role |
| --- | --- |
| `src/lib/api/server.ts` | `serverFetch`: call → on 401 refresh → retry; persists new cookies when the context allows it |
| `src/lib/api/client.ts` | `clientFetch`: same 3 steps, through the BFF; shared single refresh for concurrent 401s |
| `src/app/api/bff/[...path]/route.ts` | Generic BFF proxy. Forwards only the access cookie; passes `Set-Cookie`, status and body through |
| `src/app/api/bff/auth/refresh/route.ts` | Refresh endpoint for the client; sets new cookies on the response |
| `src/proxy.ts` | Runs before rendering: refreshes missing/expiring tokens, sets cookies on the browser **and** on the request being rendered, protects routes |
| `src/lib/api/refresh.ts` | Single-flight + 60 s grace cache around the backend refresh (the backend rotates refresh tokens) |
| `src/lib/api/error.ts` | `ApiErrorShape`, `ApiError`, `parseApiError`, `tryApi`, `fieldErrorsToRecord` |

### Why the proxy is needed
Server Components cannot write cookies. Without the proxy, a token refreshed during rendering would never reach
the browser, and since the backend invalidates the old refresh token on every refresh, the session would die.
The proxy refreshes *before* rendering, so pages just read fresh cookies. If a refresh still happens inside a
Server Component (rare), the result is cached for 60 s and the proxy hands it to the browser on the next request.

## Usage

```ts
// Server Component / Server Action / Route Handler
import { serverFetch } from "@/lib/api/server";
import { tryApi, type ApiSuccess } from "@/lib/api/error";

const { data, error } = await tryApi(serverFetch<ApiSuccess<PkgList>>("/user/pkgs", { query: { page: 1 } }));
if (error) { /* error.statusCode, error.code, error.message, error.fieldErrors */ }

// Client component
import { clientFetch } from "@/lib/api/client";
await clientFetch("/auth/login", { method: "POST", body: { phone } });   // objects are sent as JSON
```

Errors always arrive as `{ statusCode, code, message, path, timestamp, fieldErrors?, details? }`.
Non-standard responses (gateway HTML, network failure) are converted to the same shape
(`NETWORK_ERROR`, `INVALID_RESPONSE`, ...). For forms: `fieldErrorsToRecord(error)` → `{ phone: "..." }`.
Class instances don't survive the server→client boundary, so return `error.toJSON()` / `tryApi` results from actions.

## Notes
- Add protected routes in `PROTECTED_PREFIXES` in `src/proxy.ts`.
- Request bodies are re-sent on retry, so use JSON/strings/FormData (not streams).
- The refresh cache is per Node process; with several instances, back `refreshSession` with a shared store.
- Backend logout doesn't clear cookies; `/api/auth/logout` does it.
