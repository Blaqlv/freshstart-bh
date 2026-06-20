"use client";

import { useActionState } from "react";
import { resumeIntake, type StepState } from "@/app/intake/actions";

export function IntakeResume() {
  const [state, action, pending] = useActionState<StepState, FormData>(resumeIntake, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-ink-soft">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 focus:border-brand-dark"
        />
      </div>
      <div>
        <label htmlFor="code" className="block text-xs font-medium text-ink-soft">Resume code</label>
        <input
          id="code"
          name="code"
          required
          placeholder="e.g. 1A2B3C4D"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 uppercase tracking-widest focus:border-brand-dark"
        />
      </div>
      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-dark px-6 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Resuming…" : "Resume intake"}
      </button>
    </form>
  );
}
