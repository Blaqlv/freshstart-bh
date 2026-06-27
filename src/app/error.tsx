"use client";

import { useEffect } from "react";
import { logClientError } from "@/app/_actions/log-error";
import { CRISIS_BANNER, CRISIS_PHONE, CRISIS_PHONE_HREF } from "@/lib/constants";

/**
 * Global error boundary / 500 page (A7).
 *
 * This is the last line of defense, so it renders the crisis banner inline from
 * constants (no DB, no shared component that could itself fail) and shows the
 * tappable phone number. Errors are logged to the audit log server-side via a
 * server action before any stack detail would ever reach the UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError({
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      message: error.message,
      digest: error.digest,
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Inline crisis banner — never depends on the DB or another component (A12) */}
      <div role="alert" className="bg-accent text-white">
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm font-medium sm:px-6 lg:px-8">
          {CRISIS_BANNER}
        </div>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <section className="max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-brand-dark">Something Went Wrong</h1>
          <p className="mt-4 text-ink-soft">
            We&apos;re experiencing a technical issue. If you need immediate support,
            please call us directly.
          </p>
          <a
            href={CRISIS_PHONE_HREF}
            className="mt-6 inline-block text-2xl font-bold text-accent hover:underline"
          >
            {CRISIS_PHONE}
          </a>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-line px-5 py-3 font-semibold text-brand-dark hover:bg-brand-tint"
            >
              Return to Homepage
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
