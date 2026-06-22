import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/Container";

/**
 * Accreditation & Certification.
 *
 * This static route intentionally shadows the CMS catch-all ((site)/[...slug])
 * for /about/accreditation so we can render the alternating image/text layout
 * for the CARF and OhioMHAS credentials (Prompt 4, Change D). The seeded CMS
 * page at slug "about/accreditation" is left untouched in the database.
 *
 * Images live in public/images/accreditations/. They are placeholders until the
 * official certificate scans are dropped in at the same paths — no code change
 * needed to swap them.
 */

export const metadata: Metadata = {
  title: "Accreditation & Certification",
  description:
    "Fresh Start Behavioral Health is CARF accredited and OhioMHAS certified — independent recognition of our commitment to quality and safety.",
};

export default function AccreditationPage() {
  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Accreditation &amp; Certification</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Fresh Start Behavioral Health, Inc. maintains active accreditation and certification
            from leading national and state bodies. These credentials reflect our commitment to
            quality, safety, and continuous improvement in everything we do.
          </p>
        </Container>
      </section>

      <Container className="py-8">
        {/* Section 1 — CARF: text left, image right */}
        <section className="grid grid-cols-1 items-center gap-12 py-16 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-brand-dark">CARF Accreditation</h2>
            <p className="text-ink-soft">
              CARF (Commission on Accreditation of Rehabilitation Facilities) is an internationally
              recognised accreditor of health and human services organisations. CARF accreditation
              demonstrates that Fresh Start Behavioral Health, Inc. meets rigorous standards for the
              quality, value, and optimal outcomes of services focused on the needs of the persons
              served. Our CARF accreditation reflects our ongoing commitment to continuous quality
              improvement and the highest standards of care.
            </p>
          </div>
          <div className="flex justify-center">
            <Image
              src="/images/accreditations/carf_cert.png"
              alt="CARF Accreditation Certificate"
              width={350}
              height={250}
              className="h-auto w-full max-w-sm rounded-lg object-contain shadow-md"
              priority
            />
          </div>
        </section>

        <hr className="my-4 border-t border-line" />

        {/* Section 2 — OhioMHAS: image left, text right.
            On mobile the text appears above the image (correct reading order). */}
        <section className="grid grid-cols-1 items-center gap-12 py-16 md:grid-cols-2">
          <div className="order-2 flex justify-center md:order-1">
            <Image
              src="/images/accreditations/ohio_mhas.png"
              alt="Ohio MHAS Certification"
              width={267}
              height={92}
              className="h-auto w-full max-w-sm rounded-lg object-contain"
            />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="mb-4 text-2xl font-bold text-brand-dark">OhioMHAS Certification</h2>
            <p className="text-ink-soft">
              The Ohio Mental Health and Addiction Services (OhioMHAS) is the state agency
              responsible for overseeing and regulating behavioral health services in Ohio.
              Certification by OhioMHAS confirms that Fresh Start Behavioral Health, Inc. meets
              Ohio&apos;s standards for the delivery of mental health and substance use disorder
              services, and enables us to serve Medicaid-enrolled patients across our Ohio
              locations. Our OhioMHAS certification is maintained through ongoing compliance with
              state regulations and quality standards.
            </p>
          </div>
        </section>

        {/* Trust-badge row */}
        <div className="mt-8 rounded-card border border-line bg-brand-tint/40 px-6 py-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-10">
            <Image
              src="/images/accreditations/carf_cert.png"
              alt="CARF Accreditation"
              width={350}
              height={250}
              className="h-20 w-auto object-contain"
            />
            <Image
              src="/images/accreditations/ohio_mhas.png"
              alt="Ohio MHAS Certification"
              width={267}
              height={92}
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="mt-6 text-sm font-medium text-ink-soft">
            Proud to be CARF accredited and OhioMHAS certified.
          </p>
        </div>
      </Container>
    </>
  );
}
