"use client";

import { useActionState } from "react";
import { confirmMfa, type MfaState } from "@/app/admin/security/actions";

export function MfaSetup({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  const [state, action, pending] = useActionState<MfaState, FormData>(confirmMfa, {});

  if (state.ok) {
    return (
      <div role="status" className="rounded-card border border-brand bg-brand-tint p-6">
        <h2 className="font-semibold text-brand-dark">Two-factor authentication is enabled.</h2>
        <p className="mt-2 text-sm text-ink-soft">You&rsquo;ll be asked for a code at your next sign-in.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h2 className="font-semibold text-brand-dark">1. Scan this code</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Use an authenticator app (Google Authenticator, Authy, 1Password, etc.).
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="MFA QR code" className="mt-4 h-48 w-48 rounded-lg border border-line" />
        <p className="mt-3 text-xs text-ink-soft">
          Or enter this key manually:
          <br />
          <code className="mt-1 inline-block break-all rounded bg-surface-alt px-2 py-1 text-ink">{secret}</code>
        </p>
      </div>
      <div>
        <h2 className="font-semibold text-brand-dark">2. Enter the 6-digit code</h2>
        <form action={action} className="mt-4 space-y-3">
          <input
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full rounded-lg border border-line px-3 py-2 tracking-widest focus:border-brand-dark"
          />
          {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Enable two-factor"}
          </button>
        </form>
      </div>
    </div>
  );
}
