import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { acceptedInsurance, site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { serviceSchema } from "@/lib/jsonld";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ServiceSidebar } from "@/components/cms/ServiceSidebar";
import { parseBlocks, splitBlocksForSidebar } from "@/lib/cms/blocks";

export const dynamic = "force-dynamic";

type Faq = { q: string; a: string };

async function getService(slug: string) {
  return db.service.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      page: {
        include: {
          versions: { orderBy: { version: "desc" }, take: 1, where: { status: "PUBLISHED" } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) return {};
  return { title: s.title, description: s.summary ?? undefined };
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  // If a published CMS page is linked, render its blocks alongside the standard
  // service sidebar — service pages always show the sidebar, regardless of any
  // page-level hasSidebar setting. Full-bleed blocks (hero, CTA banner, related
  // services grid, etc.) already manage their own section/Container, so only
  // the narrow "content" runs (richText, FAQ, icon list...) are paired with the
  // sidebar — otherwise those full-bleed sections would get squeezed into the
  // sidebar's content column instead of spanning the page.
  const publishedVersion = service.page?.versions?.[0];
  if (service.pageId && publishedVersion) {
    const blocks = parseBlocks(publishedVersion.blocks);
    const segments = splitBlocksForSidebar(blocks);
    return (
      <>
        {segments.map((segment, i) =>
          segment.wide ? (
            <BlockRenderer key={i} blocks={segment.blocks} />
          ) : (
            <Container key={i} className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
              <div>
                <BlockRenderer blocks={segment.blocks} />
              </div>
              <ServiceSidebar currentSlug={slug} />
            </Container>
          ),
        )}
      </>
    );
  }

  const faqs = (Array.isArray(service.faqs) ? service.faqs : []) as unknown as Faq[];
  const related = await db.service.findMany({
    where: { status: "PUBLISHED", slug: { not: slug } },
    orderBy: { order: "asc" },
    take: 3,
  });

  return (
    <>
      <JsonLd schema={serviceSchema(service)} />
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          {/* Breadcrumbs removed per design update - Prompt 4. Do not restore without explicit instruction. */}
          <h1 className="text-4xl font-bold sm:text-5xl">{service.title}</h1>
          {service.summary && <p className="mt-4 max-w-2xl text-lg text-white/85">{service.summary}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact#appointment" variant="white">Book an Assessment</Button>
            <Button href="/contact" variant="secondary" className="border-white text-white hover:bg-white hover:text-brand-dark">
              Request Information
            </Button>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-16 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          {service.description && (
            <div>
              <h2 className="text-2xl font-bold text-brand-dark">About this service</h2>
              <div className="mt-3 space-y-4 text-ink-soft">
                {service.description.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )}

          {service.eligibility.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-brand-dark">Who is eligible</h2>
              <ul className="mt-4 space-y-3">
                {service.eligibility.map((e) => (
                  <li key={e} className="flex items-start gap-2 text-ink-soft">
                    <span aria-hidden className="mt-1 text-brand-dark">•</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {faqs.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-brand-dark">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-line rounded-card border border-line">
                {faqs.map((f, i) => (
                  <details key={i} className="group p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-brand-dark">
                      {f.q}
                      <span aria-hidden className="ml-4 transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-ink-soft">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-card border border-line bg-surface-alt p-6">
            <h2 className="font-semibold text-brand-dark">Get started today</h2>
            <p className="mt-2 text-sm text-ink-soft">{site.sameDayNote}</p>
            <a href={site.phoneHref} className="mt-3 block text-2xl font-bold text-brand-dark hover:underline">
              {site.phone}
            </a>
            <div className="mt-4 flex flex-col gap-2">
              <Button href="/contact#appointment">Book an Assessment</Button>
              <Button href="/insurance" variant="secondary">Verify Insurance</Button>
            </div>
          </div>
          <div className="rounded-card border border-line p-6">
            <h2 className="font-semibold text-brand-dark">Insurance accepted</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {acceptedInsurance.slice(0, 8).map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-brand-dark">✓</span><span>{i}</span>
                </li>
              ))}
            </ul>
            <Link href="/insurance" className="mt-3 inline-block text-sm font-semibold text-brand-dark hover:underline">
              See all accepted insurance →
            </Link>
          </div>
        </aside>
      </Container>

      {related.length > 0 && (
        <section className="bg-surface-alt py-16">
          <Container>
            <h2 className="text-2xl font-bold text-brand-dark">Related services</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/services/${r.slug}`} className="block h-full rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg">
                    <h3 className="font-semibold text-brand-dark">{r.title}</h3>
                    {r.summary && <p className="mt-2 text-sm text-ink-soft">{r.summary}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
