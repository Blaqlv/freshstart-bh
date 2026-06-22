import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Locations",
  description:
    "Fresh Start Behavioral Health offices in Dayton, Cincinnati, and Milford, Ohio. Find addresses, phone numbers, and directions.",
};

function mapsEmbed(addr: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;
}
function directions(addr: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
}

export default async function LocationsPage() {
  const locations = await db.location.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          {/* Breadcrumbs removed per design update - Prompt 4. Do not restore without explicit instruction. */}
          <h1 className="text-4xl font-bold sm:text-5xl">Our Locations</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Offices across the Dayton, Cincinnati, and Milford areas. Reach our main line at{" "}
            <a href={site.phoneHref} className="font-semibold underline">{site.phone}</a>.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-10 lg:grid-cols-2">
          {locations.map((loc) => {
            const fullAddr = `${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`;
            return (
              <li key={loc.id} className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
                <iframe
                  title={`Map of ${loc.name}`}
                  src={mapsEmbed(fullAddr)}
                  className="h-56 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="p-6">
                  <h2 className="text-xl font-bold text-brand-dark">
                    <Link href={`/locations/${loc.slug}`} className="hover:underline">{loc.name}</Link>
                  </h2>
                  {loc.blurb && <p className="mt-2 text-ink-soft">{loc.blurb}</p>}
                  <address className="mt-4 not-italic text-sm text-ink">
                    {loc.street}<br />{loc.city}, {loc.state} {loc.zip}
                  </address>
                  <p className="mt-2 text-sm">
                    <a href={`tel:${(loc.phone ?? site.phone).replace(/[^0-9]/g, "")}`} className="font-semibold text-brand-dark hover:underline">
                      {loc.phone ?? site.phone}
                    </a>
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button href="/contact#appointment">Book Appointment</Button>
                    <a href={directions(fullAddr)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full border-2 border-brand-dark px-6 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-dark hover:text-white">
                      Get Directions
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}
