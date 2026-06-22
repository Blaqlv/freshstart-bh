import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { site } from "@/lib/site";

/**
 * Sober Living Home — bespoke service page (Prompt 5).
 *
 * This static route intentionally shadows the CMS-driven (site)/services/[slug]
 * template for this one slug so we can render the richer, content-specific
 * layout (benefits grid, program-phase cards, FAQ accordion, related cards,
 * embedded appointment form). The other 13 services continue to render through
 * the shared [slug] template; the seeded Service record is left untouched.
 */

export const dynamic = "force-dynamic";

const PAGE_URL = `${site.url}/services/sober-living-home`;
const DESCRIPTION =
  "As you transition to a sober life, we can lend a helping hand, a trustful ear, and a compassionate, safe place to stay.";
const TITLE = "Sober Living Home in Dayton, OH | Fresh Start Behavioral Health";

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Fresh Start Behavioral Health"
  // template, since TITLE already includes the brand suffix.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const benefits = [
  "Structured environment",
  "Support network",
  "Peer support",
  "Accountability",
  "Sober living skills",
  "Gradual transition",
  "Relapse prevention",
  "Safe and substance-free environment",
  "Access to resources",
  "Emotional support",
  "Improved long-term outcomes",
];

const programCards = [
  {
    badge: "Phase 1",
    heading: "Entry Level House (30–45 Days)",
    body:
      "Each patient enters and remains at an Entry Level House for 30–45 days depending upon their overall adjustment and compliance to program rules and regulations. Patients will not have any free time during this period. They will attend 5 three-hour groups and 2 Individual Therapy sessions, with case management services as needed. Additionally, all patients are required to attend 5–6 twelve-step meetings (AA/NA) per week and provide verification of such.",
  },
  {
    badge: "Phase 2",
    heading: "Permanent Residence (Ongoing)",
    body:
      "After exiting the Entry Level House, the patient is transitioned into a more permanent residence where they will continue with group and individual therapy sessions, coupled with case management services and twelve-step meetings. Every patient will have ongoing evaluations to determine the number of required groups and counseling sessions, as determined by the Clinical Team. After transitioning into a permanent residence, each patient will remain on restriction for 15 days, after which they will be free to spend time in the community with family and friends.",
  },
  {
    badge: "Terms",
    heading: "Program Terms & Conditions",
    body:
      "There are no program fees to reside in FSBH Sober Living Housing, and each patient can remain in housing for up to two (2) years providing they remain compliant with all program rules and regulations. Every patient is subject to random urine screens and breathalyzers. Being in possession of or using any mood-altering substances in the residences will result in immediate termination from housing.",
  },
];

const faqs = [
  {
    q: "How is progress monitored in a sober living home?",
    a: "Residents' progress is monitored through a combination of structured activities and regular assessments. Upon entering, each resident is subject to an initial adjustment period in the Entry Level House, where their compliance with program rules and engagement in therapy and group sessions are closely observed. Following this period, residents transition to a more permanent residence while continuing therapy and community meetings, with ongoing evaluations by the Clinical Team to tailor the number of required sessions to each individual's recovery journey.",
  },
  {
    q: "What type of support network can I expect in a sober living home?",
    a: "Residents of Fresh Start Behavioral Health's Sober Living Residential Program benefit from a robust support network designed to aid their recovery journey. This network includes access to counselors, case managers, and a community of individuals who are also on the path to sobriety. The structured living environment, combined with a strong support network, provides residents with the necessary tools and encouragement to focus on their recovery and transition towards a life of sobriety.",
  },
  {
    q: "What happens if a resident violates the rules in a sober living home?",
    a: "In the Sober Living Residential Program, adherence to program rules and regulations is paramount for the safety and progress of all residents. Violations, especially those involving the possession or use of mood-altering substances within the residences, result in immediate termination from the housing program. This strict policy underscores the commitment to maintaining a drug- and alcohol-free environment conducive to recovery. The program employs random urine screens and breathalyzers as part of its monitoring process to ensure compliance.",
  },
];

const relatedServices = [
  { title: "Judicial Services", href: "/services/judicial-services", summary: "Court-coordinated assessment and rehabilitation services." },
  { title: "Case Management", href: "/services/case-management", summary: "Coordinated support to connect you with the resources you need." },
  { title: "Crisis Services", href: "/services/crisis-services", summary: "Urgent mental health support when you need it most." },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-dark">
      <path
        fill="currentColor"
        d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm3.7 6.3-4.2 4.2a1 1 0 0 1-1.4 0L6.3 10.7a1 1 0 0 1 1.4-1.4l1.1 1.1 3.5-3.5a1 1 0 0 1 1.4 1.4Z"
      />
    </svg>
  );
}

const medicalWebPageLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Sober Living Home in Dayton, OH",
  description: DESCRIPTION,
  url: PAGE_URL,
  about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
  provider: {
    "@type": "MedicalOrganization",
    name: "Fresh Start Behavioral Health, Inc.",
    url: site.url,
    telephone: "+19375790073",
  },
  specialty: "Addiction Medicine",
  audience: {
    "@type": "Patient",
    description: "Individuals completing addiction treatment seeking structured transitional housing",
  },
};

const faqPageLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function SoberLivingHomePage() {
  const [locations, services] = await Promise.all([
    db.location.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    db.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }} />

      {/* 1. Hero */}
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Sober Living Home in Dayton, OH</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{DESCRIPTION}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact#appointment" variant="white">Book an Assessment</Button>
            <Button href="#contact-form" variant="secondary" className="border-white text-white hover:bg-white hover:text-brand-dark">
              Request Information
            </Button>
          </div>
        </Container>
      </section>

      <Container className="space-y-16 py-16">
        {/* 2. What Is a Sober Living House? */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">What Is a Sober Living House?</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            We&rsquo;re pleased to offer an alcohol- and drug-free environment through our sober living homes.
            Our Sober Living Residential Program, a no-cost initiative, is designed to provide essential
            assistance in a safe and supportive setting. This program offers structured living, a robust
            support network of counselors, and a community of individuals all striving toward common goals.
            Our residential program is designed to immerse you in a welcoming environment focused on recovery.
          </p>
        </section>

        {/* 3. Benefits */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">What Are the Benefits of a Sober Living Home?</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            A sober living home is an invaluable resource for individuals transitioning from addiction
            treatment to independent living. By offering a structured living environment, a robust support
            network of counselors, and a community of peers all working toward common goals, sober living
            homes provide a supportive and welcoming atmosphere focused on recovery. The benefits of living
            in a supportive setting are numerous and can significantly enhance the recovery process with
            the following:
          </p>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-ink-soft">
                <CheckIcon />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Candidate */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">Am I a Candidate for a Sober Living Home?</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            A good candidate for our Sober Living Residential Program is someone who has recently finished
            a rehab program and wants to keep building on their recovery. If you feel like you may need
            extra support before returning to everyday life, or if you&rsquo;re worried about going back to
            surroundings where staying sober is difficult, our sober living house may provide a solution.
            You must commit yourself to following a structured routine and staying free of drugs or alcohol.
            Our program offers a stable place where you can focus on your recovery while getting the support
            and accountability you need.
          </p>
        </section>

        {/* 5. What Can I Expect? + program cards */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">What Can I Expect From a Sober Living House?</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            Residents of our sober living house are committed to abstaining from drug use or alcohol while
            participating in therapy programs and actively learn skills that will help them transition to a
            new life in recovery and sobriety. We also provide whatever help is needed in transporting you
            to our facility. Contact our compassionate counseling team in Dayton, Cincinnati, or Milford,
            OH to find out if our sober living residential program is a good fit for your needs.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {programCards.map((c) => (
              <div key={c.heading} className="rounded-card border border-line p-6">
                <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
                  {c.badge}
                </span>
                <h3 className="mt-4 text-lg font-bold text-brand-dark">{c.heading}</h3>
                <p className="mt-3 text-sm text-ink-soft">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. After Leaving */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">What Should I Expect After Leaving a Sober Living Home?</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            After leaving a sober living home, you can expect a period of adjustment as you take on
            greater independence while continuing to prioritize your recovery. This transition often
            involves maintaining the structure and routines that supported your sobriety, such as attending
            therapy sessions, participating in support groups, and practicing healthy coping strategies.
            You may begin reintegrating into work, school, or family life while managing new responsibilities
            and potential triggers. At Fresh Start Behavioral Health in Dayton, OH, we emphasize the
            importance of ongoing support and connection to community resources to help you stay grounded,
            confident, and committed to long-term recovery.
          </p>
        </section>

        {/* 7. Making a Decision */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">Making a Decision</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            Many people struggling with sobriety benefit from residing in a sober living house after
            completing treatment. As you begin the road to sobriety and focus on the 12 steps of recovery,
            our certified counselors can help you decide if our transitional environment is the right place
            for you. Contact Fresh Start Behavioral Health, Inc. in Dayton or Milford, OH to find out if
            our compassionate care is the boost you need to change your life.
          </p>
        </section>

        {/* 8. FAQs */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">Sober Living Home FAQs</h2>
          <div className="mt-4 divide-y divide-line rounded-card border border-line">
            {faqs.map((f) => (
              <details key={f.q} name="slh-faq" className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-brand-dark">
                  {f.q}
                  <span aria-hidden className="ml-4 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Related Services */}
        <section>
          <h2 className="text-2xl font-bold text-brand-dark">Related Services</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {relatedServices.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="flex h-full items-start justify-between gap-3 rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg"
                >
                  <span>
                    <span className="block font-semibold text-brand-dark">{r.title}</span>
                    <span className="mt-2 block text-sm text-ink-soft">{r.summary}</span>
                  </span>
                  <span aria-hidden className="text-brand-dark">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Ready to Get Started? CTA panel */}
        <section className="rounded-card border border-line bg-surface-alt p-6 sm:p-8">
          <h2 className="text-xl font-bold text-brand-dark">Ready to Get Started?</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Contact us today to find out if our Sober Living Residential Program is the right next step in
            your recovery.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button href="#contact-form">Contact Us</Button>
            <a href={site.phoneHref} className="text-lg font-bold text-brand-dark hover:underline">
              {site.phone}
            </a>
          </div>
        </section>

        {/* 10. Get In Touch / Contact form */}
        <section id="contact-form" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-brand-dark">Get In Touch</h2>
          <p className="mt-2 text-sm text-ink-soft">{site.sameDayNote}</p>
          <div className="mt-6 max-w-3xl">
            <AppointmentForm
              locations={locations.map((l) => ({ value: l.slug, label: l.name }))}
              services={services.map((s) => ({ value: s.slug, label: s.title }))}
              defaultService="sober-living-home"
            />
          </div>
        </section>

        {/* 11. Disclaimer */}
        <p className="text-xs text-ink-soft">
          Individual results are not guaranteed and may vary from person to person.
          Images may contain models.
        </p>
      </Container>
    </>
  );
}
