import Link from "next/link";
import type { Metadata } from "next";
import { StandaloneChrome } from "@/components/layout/StandaloneChrome";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

/**
 * 404 (A7). Keeps full site chrome + crisis banner and gives three clear paths
 * back to key resources.
 */
export default function NotFound() {
  return (
    <StandaloneChrome>
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
        {/* Compass — direction-finding metaphor, brand palette (A7) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 96 96"
          className="mx-auto h-24 w-24"
          fill="none"
        >
          <circle cx="48" cy="48" r="44" stroke="var(--color-brand)" strokeWidth="4" />
          <circle cx="48" cy="48" r="34" stroke="var(--color-brand-tint)" strokeWidth="2" />
          <path d="M48 22 56 48 48 74 40 48Z" fill="var(--color-accent)" />
          <path d="M48 74 40 48 48 48Z" fill="var(--color-brand-dark)" />
          <circle cx="48" cy="48" r="4" fill="var(--color-brand-dark)" />
        </svg>
        <h1 className="mt-6 text-3xl font-bold text-brand-dark">Page Not Found</h1>
        <p className="mt-4 text-ink-soft">
          The page you&apos;re looking for may have moved or no longer exists.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover"
          >
            Go to Homepage
          </Link>
          <Link
            href="/services"
            className="rounded-lg border border-line px-5 py-3 font-semibold text-brand-dark hover:bg-brand-tint"
          >
            Find a Service
          </Link>
          <Link
            href="/contact"
            className="rounded-lg border border-line px-5 py-3 font-semibold text-brand-dark hover:bg-brand-tint"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </StandaloneChrome>
  );
}
