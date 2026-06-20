"use client";

import { useActionState } from "react";
import { submitIntake, intakeBack, type StepState } from "@/app/intake/actions";
import { INTAKE_STEPS } from "@/lib/intake";

export function IntakeReview({
  data,
  stepNumber,
  totalSteps,
}: {
  data: Record<string, string>;
  stepNumber: number;
  totalSteps: number;
}) {
  const [state, action, pending] = useActionState<StepState, FormData>(submitIntake, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          Step {stepNumber} of {totalSteps}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">Review &amp; sign</h1>
        <p className="mt-1 text-sm text-ink-soft">Please review your answers, then sign to submit.</p>
      </div>

      <div className="space-y-4">
        {INTAKE_STEPS.map((step) => (
          <section key={step.key} className="rounded-card border border-line bg-white p-5">
            <h2 className="font-semibold text-brand-dark">{step.title}</h2>
            <dl className="mt-2 divide-y divide-line">
              {step.fields.map((f) => {
                const v = data[f.name];
                return (
                  <div key={f.name} className="grid grid-cols-3 gap-3 py-2">
                    <dt className="text-sm text-ink-soft">{f.label}</dt>
                    <dd className="col-span-2 text-sm text-ink">
                      {v ? v : <span className="text-ink-soft">—</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      <form action={action} className="space-y-4 rounded-2xl border border-brand bg-brand-tint p-6">
        <h2 className="font-semibold text-brand-dark">Electronic signature</h2>
        <p className="text-sm text-ink-soft">
          By typing my name below, I certify that the information I&rsquo;ve provided is accurate to
          the best of my knowledge.
        </p>
        <div>
          <label htmlFor="signedName" className="block text-sm font-medium text-ink">Type your full name</label>
          <input
            id="signedName"
            name="signedName"
            required
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 focus:border-brand-dark"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="attest" className="mt-1" />
          <span>I am the patient (or authorized representative) and this is my electronic signature.</span>
        </label>
        {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-dark px-6 py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit intake"}
        </button>
      </form>

      <form action={intakeBack}>
        <button
          type="submit"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-alt"
        >
          Back
        </button>
      </form>
    </div>
  );
}
