"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { toErrorShape, type ApiErrorShape, type ApiSuccess } from "@/lib/api/error";
import type { Pkg, PkgList } from "@/lib/types";

/** Example of a client-side call: browser -> /api/bff/user/pkgs -> backend. */
export function PkgSearch() {
  const [search, setSearch] = useState("");
  const [pkgs, setPkgs] = useState<Pkg[] | null>(null);
  const [error, setError] = useState<ApiErrorShape | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch<ApiSuccess<PkgList>>("/user/pkgs", { query: { search, page: 1 } });
      setPkgs(res.data.pkgs);
    } catch (err) {
      setError(toErrorShape(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>جستجو (درخواست سمت کلاینت از طریق BFF)</h2>
      {error && (
        <div className="alert" role="alert">
          {error.message} <span className="muted ltr">({error.code})</span>
        </div>
      )}
      <div className="row">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="عنوان پکیج" />
        <button type="submit" disabled={loading}>
          {loading ? "..." : "جستجو"}
        </button>
      </div>
      {pkgs && (
        <ul className="list">
          {pkgs.length === 0 && <li className="muted">نتیجه‌ای یافت نشد.</li>}
          {pkgs.map((pkg) => (
            <li key={pkg.id}>{pkg.title}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
