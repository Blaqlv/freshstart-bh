import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { acceptedInsurance, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mental Health Treatment",
  description:
    "Personalized mental health treatment in Dayton, Cincinnati & Milford, OH — for depression, anxiety, bipolar disorder, PTSD, and more.",
};

const treats = [
  "Depression & mood disorders",
  "Anxiety & panic disorders",
  "Bipolar disorder",
  "PTSD & trauma",
  "ADHD",
  "Schizophrenia & psychotic disorders",
  "OCD",
  "Co-occurring substance use",
];

const eligibility = [
  "Children, adolescents, and adults are welcome.",
  "New and existing patients across our Ohio locations.",
  "Most major insurance plans and Ohio Medicaid accepted; self-pay options available.",
  "Telehealth available for many appointment types.",
];

const faqs = [
  {
    q: "How do I get started?",
    a: "Call us or request an appointment online. We'll schedule an initial assessment to understand your needs and build a personalized treatment plan. Same-day appointments may be available if you call before 10 AM.",
  },
  {
    q: "Do you prescribe medication?",
    a: "Yes. Our psychiatric providers offer medication management alongside therapy when clinically appropriate, and coordinate closely with your care team.",
  },
  {
    q: "Will my insurance cover treatment?",
    a: "We accept most major insurers and Ohio Medicaid. Our team will verify your benefits before your first visit so there are no surprises.",
  },
  {
    q: "Is treatment confidential?",
    a: "Absolutely. Your care is protected under HIPAA, and we maintain strict privacy and security practices across all of our locations.",
  },
];

export default function MentalHealthPage() {
  return (
    <>
      {/* Breadcrumb + header */}
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <ol className="flex gap-2">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/services" className="hover:underline">Services</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-white">Mental Health</li>
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Mental Health Treatment</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            We offer personalized treatment for a wide range of mental health conditions so you
            can manage your symptoms and feel more empowered going forward.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact#appointment" variant="white">Book an Assessment</Button>
            <Button
              href="/contact"
              variant="secondary"
              className="border-white text-white hover:bg-white hover:text-brand-dark"
            >
              Request Information
            </Button>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-16 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-12">
          <div className="prose-fs">
            <h2 className="text-2xl font-bold text-brand-dark">A whole-person approach</h2>
            <p className="mt-3 text-ink-soft">
              At {site.name}, mental health care is never one-size-fits-all. Our psychiatrists,
              nurse practitioners, physician assistants, and licensed counselors work together
              to build a treatment plan around your goals — combining psychiatric care,
              evidence-based therapy, and ongoing support. Whether you&rsquo;re facing a new
              diagnosis or have struggled for years, we meet you with compassion and a clear
              path forward.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-brand-dark">Conditions we treat</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {treats.map((t) => (
                <li key={t} className="flex items-start gap-2 text-ink-soft">
                  <span aria-hidden className="mt-1 text-brand-dark">✓</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-brand-dark">Who is eligible</h2>
            <ul className="mt-4 space-y-3">
              {eligibility.map((e) => (
                <li key={e} className="flex items-start gap-2 text-ink-soft">
                  <span aria-hidden className="mt-1 text-brand-dark">•</span> {e}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-brand-dark">Frequently asked questions</h2>
            <div className="mt-4 divide-y divide-line rounded-card border border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-brand-dark">
                    {f.q}
                    <span aria-hidden className="ml-4 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-card border border-line bg-surface-alt p-6">
            <h2 className="font-semibold text-brand-dark">Get started today</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Same-day appointments may be available if you call before 10 AM.
            </p>
            <a
              href={site.phoneHref}
              className="mt-3 block text-2xl font-bold text-brand-dark hover:underline"
            >
              {site.phone}
            </a>
            <div className="mt-4 flex flex-col gap-2">
              <Button href="/contact#appointment">Book an Assessment</Button>
              <Button href="/insurance" variant="secondary">Verify Insurance</Button>
            </div>
          </div>

          <div className="rounded-card border border-line p-6">
            <h2 className="font-semibold text-brand-dark">Insurance accepted</h2>
            <p className="mt-2 text-sm text-ink-soft">We work with most major plans, including:</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {acceptedInsurance.slice(0, 8).map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-brand-dark">✓</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <Link href="/insurance" className="mt-3 inline-block text-sm font-semibold text-brand-dark hover:underline">
              See all accepted insurance →
            </Link>
          </div>
        </aside>
      </Container>

      {/* Related */}
      <section className="bg-surface-alt py-16">
        <Container>
          <h2 className="text-2xl font-bold text-brand-dark">Related services</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              ["Psychiatry", "/services/psychiatry", "Medication management and psychiatric evaluation for adults."],
              ["Individual & Group Therapy", "/services/individual-group-therapies", "A safe space to talk, process, and heal."],
              ["Crisis Services", "/services/crisis-services", "Urgent support when you need it most."],
            ].map(([title, href, blurb]) => (
              <li key={href}>
                <Link href={href} className="block h-full rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg">
                  <h3 className="font-semibold text-brand-dark">{title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{blurb}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
