import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Fresh Start Behavioral Health to request an appointment or ask a question. Offices in Dayton, Cincinnati, and Milford, OH.",
};

export default async function ContactPage() {
  const [locations, services] = await Promise.all([
    db.location.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    db.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Contact Us</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Request an appointment or ask a question. For a mental health emergency, call 911 or go
            to your nearest emergency department.
          </p>
        </Container>
      </section>

      <Container className="grid gap-12 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-brand-dark">Request an appointment</h2>
          <p className="mt-2 text-sm text-ink-soft">{site.sameDayNote}</p>
          <div className="mt-6">
            <AppointmentForm
              locations={locations.map((l) => ({ value: l.slug, label: l.name }))}
              services={services.map((s) => ({ value: s.slug, label: s.title }))}
            />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-card border border-line bg-surface-alt p-6">
            <h2 className="font-semibold text-brand-dark">Call us</h2>
            <a href={site.phoneHref} className="mt-1 block text-2xl font-bold text-brand-dark hover:underline">
              {site.phone}
            </a>
          </div>
          <div className="rounded-card border border-line p-6">
            <h2 className="font-semibold text-brand-dark">Our offices</h2>
            <ul className="mt-3 space-y-4 text-sm text-ink-soft">
              {locations.map((l) => (
                <li key={l.id}>
                  <span className="font-medium text-ink">{l.name}</span><br />
                  {l.street}, {l.city}, {l.state} {l.zip}
                  {l.phone && <><br /><a href={`tel:${l.phone.replace(/[^0-9]/g, "")}`} className="text-brand-dark hover:underline">{l.phone}</a></>}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </Container>
    </>
  );
}
