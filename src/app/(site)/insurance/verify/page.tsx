import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { InsuranceVerificationForm } from "@/components/forms/InsuranceVerificationForm";

export const metadata: Metadata = {
  title: "Insurance Verification",
  description: "Securely submit your insurance details and we'll verify your benefits before your first visit.",
};

export default function InsuranceVerifyPage() {
  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Verify Your Insurance</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Share your insurance details securely and our team will confirm your benefits before
            your first visit.
          </p>
        </Container>
      </section>
      <Container className="max-w-2xl py-16">
        <InsuranceVerificationForm />
      </Container>
    </>
  );
}
