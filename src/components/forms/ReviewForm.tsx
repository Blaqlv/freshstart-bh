"use client";

import { useActionState } from "react";
import { submitReview, type ReviewState } from "@/app/_actions/reviews";
import { HoneypotField } from "@/components/forms/HoneypotField";

const field = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";

/**
 * On-site review form (A9). Submissions are held for staff moderation before
 * appearing publicly.
 */
export function ReviewForm() {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {});

  if (state.ok) {
    return (
      <div role="status" className="rounded-card border border-brand bg-brand-tint p-6">
        <h3 className="font-semibold text-brand-dark">Thank you for your review!</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Your feedback has been submitted and will appear once our team has reviewed it.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <HoneypotField />
      <label className="block">
        <span className="text-sm font-medium text-ink">Your name</span>
        <input name="author" required autoComplete="name" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Rating</span>
        <select name="rating" defaultValue="5" className={field}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)} ({n})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Your review</span>
        <textarea name="quote" required rows={4} className={field} />
        <span className="mt-1 block text-xs text-ink-soft">
          Please do not include medical or confidential health information.
        </span>
      </label>

      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
