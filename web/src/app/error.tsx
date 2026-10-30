"use client";

// Errors thrown while rendering a Server Component are sanitized by Next.js in production
// (message hidden, class lost). In server components prefer `tryApi(serverFetch(...))` and
// render `error.message` yourself, as the dashboard page does.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card">
      <h1>مشکلی پیش آمد</h1>
      <p className="muted">لطفا دوباره تلاش کنید.</p>
      <button onClick={reset}>تلاش مجدد</button>
    </div>
  );
}
