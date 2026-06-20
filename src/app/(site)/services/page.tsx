import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Mental health, substance use, psychiatry, therapy, primary care, and recovery services across Dayton, Cincinnati, and Milford, OH.",
};

export default async function ServicesIndex() {
  const services = await db.service.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <ol className="flex gap-2">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-white">Services</li>
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Our Services</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            A whole-person model combining psychiatry, counseling, behavioral therapy, primary
            care, and recovery support — tailored to you.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.id}>
              <Link
                href={`/services/${s.slug}`}
                className="flex h-full flex-col rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg"
              >
                <h2 className="text-lg font-semibold text-brand-dark">{s.title}</h2>
                {s.summary && <p className="mt-2 flex-1 text-sm text-ink-soft">{s.summary}</p>}
                <span className="mt-4 text-sm font-semibold text-brand-dark">Learn more →</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button href="/contact#appointment">Book an Assessment</Button>
        </div>
      </Container>
    </>
  );
}
