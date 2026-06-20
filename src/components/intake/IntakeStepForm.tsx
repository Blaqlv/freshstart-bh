"use client";

import { useActionState } from "react";
import { saveStep, type StepState } from "@/app/intake/actions";
import type { IntakeStep, IntakeField } from "@/lib/intake";

const inputCls = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";

function Field({ field, value, invalid }: { field: IntakeField; value: string; invalid: boolean }) {
  const labelEl = (
    <label htmlFor={field.name} className="block text-sm font-medium text-ink">
      {field.label}
      {field.required && <span className="text-accent"> *</span>}
    </label>
  );
  const ring = invalid ? " border-accent" : "";

  if (field.type === "textarea") {
    return (
      <div>
        {labelEl}
        <textarea id={field.name} name={field.name} rows={3} defaultValue={value} className={inputCls + ring} />
        {field.help && <p className="mt-1 text-xs text-ink-soft">{field.help}</p>}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        {labelEl}
        <select id={field.name} name={field.name} defaultValue={value} className={inputCls + ring}>
          <option value="">Select…</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === "radio") {
    return (
      <fieldset className={invalid ? "rounded-lg border border-accent p-2" : ""}>
        <legend className="text-sm font-medium text-ink">
          {field.label}{field.required && <span className="text-accent"> *</span>}
        </legend>
        <div className="mt-1 flex gap-4">
          {field.options?.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name={field.name} value={o} defaultChecked={value === o} />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className={"flex items-start gap-2 text-sm text-ink" + (invalid ? " text-accent" : "")}>
        <input type="checkbox" name={field.name} defaultChecked={value === "Yes"} className="mt-1" />
        <span>{field.label}{field.required && <span className="text-accent"> *</span>}</span>
      </label>
    );
  }
  return (
    <div>
      {labelEl}
      <input
        id={field.name}
        name={field.name}
        type={field.type}
        defaultValue={value}
        className={inputCls + ring}
      />
      {field.help && <p className="mt-1 text-xs text-ink-soft">{field.help}</p>}
    </div>
  );
}

export function IntakeStepForm({
  step,
  values,
  stepNumber,
  totalSteps,
}: {
  step: IntakeStep;
  values: Record<string, string>;
  stepNumber: number;
  totalSteps: number;
}) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveStep, {});
  const missing = new Set(state.missing ?? []);

  return (
    <form action={action} className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          Step {stepNumber} of {totalSteps}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">{step.title}</h1>
        {step.description && <p className="mt-1 text-sm text-ink-soft">{step.description}</p>}
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm">
        {step.fields.map((f) => (
          <Field key={f.name} field={f} value={values[f.name] ?? ""} invalid={missing.has(f.name)} />
        ))}
      </div>

      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}

      <div className="flex items-center justify-between">
        {stepNumber > 1 ? (
          <button
            type="submit"
            name="direction"
            value="back"
            disabled={pending}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-alt disabled:opacity-60"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          name="direction"
          value="next"
          disabled={pending}
          className="rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save & continue"}
        </button>
      </div>
    </form>
  );
}
