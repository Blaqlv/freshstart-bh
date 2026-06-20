import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { locations, site } from "@/lib/site";

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

export default function LocationsPage() {
  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <ol className="flex gap-2">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-white">Locations</li>
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Our Locations</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Four offices across the Dayton, Cincinnati, and Milford areas. Reach our main line at{" "}
            <a href={site.phoneHref} className="font-semibold underline">{site.phone}</a>.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-10 lg:grid-cols-2">
          {locations.map((loc) => {
            const fullAddr = `${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`;
            return (
              <li
                key={loc.slug}
                className="overflow-hidden rounded-card border border-line bg-white shadow-sm"
              >
                <iframe
                  title={`Map of ${loc.name}`}
                  src={mapsEmbed(fullAddr)}
                  className="h-56 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="p-6">
                  <h2 className="text-xl font-bold text-brand-dark">{loc.name}</h2>
                  <p className="mt-2 text-ink-soft">{loc.blurb}</p>
                  <address className="mt-4 not-italic text-sm text-ink">
                    {loc.street}
                    <br />
                    {loc.city}, {loc.state} {loc.zip}
                  </address>
                  <p className="mt-2 text-sm">
                    <a
                      href={`tel:${(loc.phone ?? site.phone).replace(/[^0-9]/g, "")}`}
                      className="font-semibold text-brand-dark hover:underline"
                    >
                      {loc.phone ?? site.phone}
                    </a>
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button href="/contact#appointment">Book Appointment</Button>
                    <a
                      href={directions(fullAddr)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border-2 border-brand-dark px-6 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-dark hover:text-white"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>

      <section className="bg-brand py-16 text-white">
        <Container className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <h2 className="text-2xl font-bold sm:text-3xl">Not sure which office is right for you?</h2>
          <Button href="/contact" variant="white">Contact Us</Button>
        </Container>
      </section>
    </>
  );
}
