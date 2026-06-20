import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { acceptedInsurance } from "@/lib/site";

export const metadata: Metadata = {
  title: "Insurance Accepted",
  description:
    "Fresh Start Behavioral Health accepts most major insurance plans and Ohio Medicaid, plus self-pay options.",
};

export default function InsurancePage() {
  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Insurance Accepted</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            We work with most major insurers and Ohio Medicaid. Our team will verify your benefits
            before your first visit so there are no surprises.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {acceptedInsurance.map((i) => (
            <li key={i} className="flex items-start gap-2 rounded-card border border-line bg-white p-4 text-sm text-ink">
              <span aria-hidden className="mt-0.5 text-brand-dark">✓</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-soft">
          We also accept major credit cards and offer self-pay options. Don&rsquo;t see your plan?
          Contact us — we may still be able to help.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/insurance/verify">Verify My Insurance</Button>
          <Button href="/contact" variant="secondary">Ask a Question</Button>
        </div>
      </Container>
    </>
  );
}
