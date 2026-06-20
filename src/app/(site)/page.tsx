import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  homeServiceTiles,
  locations,
  site,
  testimonials,
} from "@/lib/site";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl"
        />
        <Container className="relative grid gap-8 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-gold" /> Behavioral Health · Dayton & Cincinnati, OH
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              {site.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Personalized mental health, substance use, and psychiatric care that helps you
              take back control of your life — combining psychiatry, counseling, behavioral
              therapy, and sober living.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/contact#appointment" variant="white">
                Book an Assessment
              </Button>
              <Button
                href="/services"
                variant="secondary"
                className="border-white text-white hover:bg-white hover:text-brand-dark"
              >
                Explore Services
              </Button>
            </div>
            <p className="mt-5 text-sm text-white/75">{site.sameDayNote}</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur ring-1 ring-white/15">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-gold">{site.rating.value}</div>
              <div className="text-sm text-white/85">
                Average rating
                <br />
                from {site.rating.count} {site.rating.source} reviews
              </div>
            </div>
            <hr className="my-5 border-white/15" />
            <a href={site.phoneHref} className="block text-sm text-white/75">
              Call us today
              <span className="mt-1 block text-2xl font-bold text-white">{site.phone}</span>
            </a>
            <p className="mt-4 text-sm text-white/75">
              4 offices across Dayton, Cincinnati & Milford
            </p>
          </div>
        </Container>
      </section>

      {/* Services */}
      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">
              How we help
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Helping People Gain Power In Their Life
            </h2>
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {homeServiceTiles.map((s) => {
              const href = s.slug === "all" ? "/services" : `/services/${s.slug}`;
              return (
                <li key={s.slug}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg"
                  >
                    <span
                      aria-hidden
                      className="grid h-11 w-11 place-items-center rounded-full bg-brand-tint text-brand-dark group-hover:bg-brand group-hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v4h4v2h-4v4h-2v-4H7v-2h4V7Z" />
                      </svg>
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-brand-dark">{s.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-ink-soft">{s.blurb}</p>
                    <span className="mt-4 text-sm font-semibold text-brand-dark group-hover:underline">
                      Learn more →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Welcome / About */}
      <section className="bg-surface-alt py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">
              The support you need
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{site.name}</h2>
            <p className="mt-5 text-ink-soft">
              &ldquo;Fresh Start&rdquo; is more than just our name — it&rsquo;s our philosophy.
              Led by medical director Irfan Dahar, MD, executive director Ebenezer Aluma, PhD,
              PA-C, and an experienced clinical leadership team, we provide personalized
              substance use and mental health treatment so you can take back control of your
              life.
            </p>
            <p className="mt-4 text-ink-soft">
              Our model incorporates psychiatric interventions, counseling, behavioral therapy,
              and sober living to equip you with the tools you need to live a healthier, more
              fulfilled life.
            </p>
            <div className="mt-8">
              <Button href="/about">About Us</Button>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              ["Personalized care", "Every treatment plan is tailored to the individual."],
              ["Whole-person model", "Psychiatry, therapy, primary care, and recovery support."],
              ["All ages welcome", "Children, adolescents, and adults across Ohio."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-card border border-line bg-white p-6">
                <h3 className="font-semibold text-brand-dark">{t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">
              Hear from our patients
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Our Reviews</h2>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <li key={t.author} className="rounded-card border border-line bg-white p-6">
                <div aria-hidden className="flex gap-0.5 text-gold">
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <blockquote className="mt-3 text-ink-soft">&ldquo;{t.quote}&rdquo;</blockquote>
                <p className="mt-4 text-sm font-semibold text-brand-dark">
                  {t.author} <span className="font-normal text-ink-soft">· {t.source}</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button href="/reviews" variant="secondary">
              Read all reviews
            </Button>
          </div>
        </Container>
      </section>

      {/* Locations */}
      <section className="bg-surface-alt py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">
                Find us
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Our Locations</h2>
            </div>
            <Button href="/locations" variant="secondary">
              View all locations
            </Button>
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {locations.map((loc) => (
              <li key={loc.slug} className="rounded-card border border-line bg-white p-6">
                <h3 className="font-semibold text-brand-dark">{loc.name}</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  {loc.street}
                  <br />
                  {loc.city}, {loc.state} {loc.zip}
                </p>
                {loc.phone && (
                  <a
                    href={`tel:${loc.phone.replace(/[^0-9]/g, "")}`}
                    className="mt-3 inline-block text-sm font-semibold text-brand-dark hover:underline"
                  >
                    {loc.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* CTA band */}
      <section className="bg-brand py-16 text-white">
        <Container className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to start your fresh start?</h2>
            <p className="mt-2 text-white/90">
              Reach out today — same-day appointments may be available.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/contact#appointment" variant="white">
              Request an Appointment
            </Button>
            <a
              href={site.phoneHref}
              className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-sm font-semibold hover:bg-white hover:text-brand-dark"
            >
              Call {site.phone}
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
