"use client";
import { useActionState } from "react";
import { createCaseAction, type CreateCaseState } from "../actions";
import { CASE_TYPES } from "@/lib/medicaid/constants";

export default function NewCasePage() {
  const [state, action, pending] = useActionState<CreateCaseState, FormData>(createCaseAction, {});
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">New Medicaid Case</h1>
      <form action={action} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Provider name</span>
          <input name="providerName" required className="w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Provider NPI (10 digits)</span>
          <input name="providerNpi" required inputMode="numeric" className="w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Case type</span>
          <select name="caseType" className="w-full rounded-lg border border-line px-3 py-2">
            {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Target deadline (optional)</span>
          <input type="date" name="targetDeadline" className="w-full rounded-lg border border-line px-3 py-2" />
        </label>
        {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
        <button type="submit" disabled={pending} className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Creating…" : "Create case"}
        </button>
      </form>
    </div>
  );
}
