"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { fieldErrorsToRecord, toErrorShape, type ApiErrorShape } from "@/lib/api/error";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<ApiErrorShape | null>(null);
  const [loading, setLoading] = useState(false);

  const fieldErrors = fieldErrorsToRecord(error);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (step === "phone") {
        await clientFetch("/auth/login", { method: "POST", body: { phone } });
        setStep("code");
      } else {
        // The BFF passes the backend's Set-Cookie headers through, so the tokens land in the browser here.
        await clientFetch("/auth/verify", { method: "POST", body: { phone, code } });
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setError(toErrorShape(err)); // always the standard error format
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>ورود</h1>

      {error && (
        <div className="alert" role="alert">
          {error.message}
        </div>
      )}

      <div className="field">
        <label htmlFor="phone">شماره موبایل</label>
        <input
          id="phone"
          className="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09123456789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={step === "code" || loading}
          required
        />
        {fieldErrors.phone && <div className="field-error">{fieldErrors.phone}</div>}
      </div>

      {step === "code" && (
        <div className="field">
          <label htmlFor="code">کد تایید</label>
          <input
            id="code"
            className="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            autoFocus
            required
          />
          {fieldErrors.code && <div className="field-error">{fieldErrors.code}</div>}
        </div>
      )}

      <div className="row">
        <button type="submit" disabled={loading}>
          {loading ? "..." : step === "phone" ? "دریافت کد" : "ورود"}
        </button>
        {step === "code" && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
          >
            تغییر شماره
          </button>
        )}
      </div>
    </form>
  );
}
