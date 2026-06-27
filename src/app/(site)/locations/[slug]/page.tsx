import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { locationSchema } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

async function getLocation(slug: string) {
  return db.location.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loc = await getLocation(slug);
  if (!loc) return {};
  return {
    title: loc.name,
    description: loc.blurb ?? `${loc.name} — ${loc.city}, ${loc.state}`,
  };
}

export default async function LocationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loc = await getLocation(slug);
  if (!loc) notFound();

  const fullAddr = `${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`;
  const phone = loc.phone ?? site.phone;

  return (
    <Container className="py-16">
      <JsonLd schema={locationSchema(loc)} />
      {/* Breadcrumbs removed per design update - Prompt 4. Do not restore without explicit instruction. */}
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark">{loc.name}</h1>
          {loc.blurb && <p className="mt-3 text-ink-soft">{loc.blurb}</p>}
          <address className="mt-6 not-italic text-ink">
            {loc.street}<br />{loc.city}, {loc.state} {loc.zip}
          </address>
          <a href={`tel:${phone.replace(/[^0-9]/g, "")}`} className="mt-3 block text-2xl font-bold text-brand-dark hover:underline">
            {phone}
          </a>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/contact#appointment">Book Appointment</Button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border-2 border-brand-dark px-6 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-dark hover:text-white"
            >
              Get Directions
            </a>
          </div>
        </div>
        <iframe
          title={`Map of ${loc.name}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddr)}&output=embed`}
          className="h-80 w-full rounded-card border border-line"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </Container>
  );
}
