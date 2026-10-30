import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/api/server";
import { tryApi, type ApiSuccess } from "@/lib/api/error";
import type { PkgList } from "@/lib/types";
import { LogoutButton } from "./logout-button";
import { PkgSearch } from "./pkg-search";

export default async function DashboardPage() {
  // Server-side fetch: main call -> (401 -> refresh) -> retry. Cookies are kept in sync by src/proxy.ts.
  const { data, error } = await tryApi(serverFetch<ApiSuccess<PkgList>>("/user/pkgs", { query: { page: 1 } }));

  if (error?.statusCode === 401) redirect("/login");

  return (
    <>
      <div className="card row">
        <h1>داشبورد</h1>
        <LogoutButton />
      </div>

      <div className="card">
        <h2>پکیج‌های من (رندر سمت سرور)</h2>
        {error ? (
          <div className="alert" role="alert">
            {error.message} <span className="muted ltr">({error.code})</span>
          </div>
        ) : data.data.pkgs.length === 0 ? (
          <p className="muted">هنوز پکیجی ندارید.</p>
        ) : (
          <ul className="list">
            {data.data.pkgs.map((pkg) => (
              <li key={pkg.id}>
                <strong>{pkg.title}</strong>
                {pkg.description && <div className="muted">{pkg.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PkgSearch />
    </>
  );
}
