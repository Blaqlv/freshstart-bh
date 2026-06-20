"use client";

import { useActionState } from "react";
import { startIntake, type StepState } from "@/app/intake/actions";

export function IntakeStart() {
  const [state, action, pending] = useActionState<StepState, FormData>(startIntake, {});
  return (
    <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="email" className="block text-xs font-medium text-ink-soft">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 focus:border-brand-dark"
        />
        {state.error && <p role="alert" className="mt-1 text-sm text-accent">{state.error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-dark px-6 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Starting…" : "Begin intake"}
      </button>
    </form>
  );
}
