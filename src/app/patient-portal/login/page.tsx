"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { patientLogin, type PatientLoginState } from "./actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/patient-portal";
  const timedOut = params.get("timeout") === "1";
  const [state, formAction, pending] = useActionState<PatientLoginState, FormData>(patientLogin, {});

  return (
    <form action={formAction} className="w-full space-y-4">
      <input type="hidden" name="next" value={next} />
      {timedOut && (
        <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          You were signed out after 15 minutes of inactivity. Please sign in again.
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 focus:border-brand-dark"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 focus:border-brand-dark"
        />
      </div>
      {state.needsMfa && (
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-ink">Authentication code</label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            autoFocus
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 tracking-widest focus:border-brand-dark"
          />
          <p className="mt-1 text-xs text-ink-soft">Enter the code from your authenticator app.</p>
        </div>
      )}
      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-dark px-4 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Signing in…" : state.needsMfa ? "Verify & sign in" : "Sign in"}
      </button>
    </form>
  );
}

export default function PatientLoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white font-bold">FS</span>
          <span className="font-bold text-brand-dark">Patient Portal</span>
        </div>
        <h1 className="text-lg font-semibold">Sign in to your portal</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Secure access to messages, appointments, documents, and statements.
        </p>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 border-t border-line pt-4 text-xs text-ink-soft">
          New patient?{" "}
          <a href="/intake" className="font-medium text-accent hover:underline">Start your intake</a>{" "}
          to get set up before your first visit.
        </p>
      </div>
    </div>
  );
}
