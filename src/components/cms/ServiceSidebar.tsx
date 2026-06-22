import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { acceptedInsurance, site } from "@/lib/site";

/**
 * Static service-style sidebar: contact CTAs, phone, accepted insurance, and up
 * to three related services. Static content is sourced from src/lib/site.ts (the
 * in-sync source of truth) rather than hardcoded. Related services are derived
 * (3 other published Service records); there is no relatedServiceIds field.
 */
export async function ServiceSidebar({ currentSlug }: { currentSlug?: string }) {
  const related = await db.service.findMany({
    where: { status: "PUBLISHED", ...(currentSlug ? { slug: { not: currentSlug } } : {}) },
    orderBy: { order: "asc" },
    take: 3,
  });

  return (
    <aside className="space-y-6">
      <div className="rounded-card border border-line bg-surface-alt p-6">
        <h2 className="font-semibold text-brand-dark">Ready to Get Started?</h2>
        <p className="mt-2 text-sm text-ink-soft">{site.sameDayNote}</p>
        <a
          href={site.phoneHref}
          className="mt-3 block text-2xl font-bold text-brand-dark hover:underline"
        >
          {site.phone}
        </a>
        <div className="mt-4 flex flex-col gap-2">
          <Button href="/intake">Book an Assessment</Button>
          <Button href="#contact-form" variant="secondary">
            Request Information
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-line p-6">
        <h2 className="font-semibold text-brand-dark">Insurance accepted</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          {acceptedInsurance.slice(0, 8).map((name) => (
            <li key={name} className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 text-brand-dark">
                ✓
              </span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/insurance"
          className="mt-3 inline-block text-sm font-semibold text-brand-dark hover:underline"
        >
          See all accepted insurance →
        </Link>
      </div>

      {related.length > 0 && (
        <div className="rounded-card border border-line p-6">
          <h2 className="font-semibold text-brand-dark">Related services</h2>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/services/${r.slug}`}
                  className="font-medium text-brand-dark hover:underline"
                >
                  {r.title}
                </Link>
                {r.summary && <p className="mt-0.5 text-sm text-ink-soft">{r.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
