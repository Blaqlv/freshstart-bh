"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logClientError } from "@/app/_actions/log-error";
import { CRISIS_PHONE, CRISIS_PHONE_HREF } from "@/lib/constants";

/**
 * Page-level error boundary for the public site (A7 / A12).
 *
 * Because this lives inside the (site) route group, the surrounding layout —
 * crisis banner, header, footer — keeps rendering when a page's data fetch or
 * component throws. Only this segment is replaced. That guarantees a patient in
 * crisis still sees the 911 banner and the phone number even on a hard error.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError({
      route: typeof window !== "undefined" ? window.location.pathname : "(site)",
      message: error.message,
      digest: error.digest,
    }).catch(() => {});
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-brand-dark">Something went wrong</h1>
      <p className="mt-4 text-ink-soft">
        We&apos;re experiencing a technical issue on this page. If you need immediate
        support, please call us directly.
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
        <Link
          href="/"
          className="rounded-lg border border-line px-5 py-3 font-semibold text-brand-dark hover:bg-brand-tint"
        >
          Return to homepage
        </Link>
      </div>
    </section>
  );
}
