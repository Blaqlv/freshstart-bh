import Link from "next/link";
import { db } from "@/lib/db";
import { getIntakeId } from "@/lib/intake-auth";

export const dynamic = "force-dynamic";

export default async function IntakeComplete() {
  const id = await getIntakeId();
  const attempt = id
    ? await db.verificationAttempt.findFirst({ where: { intakeId: id, source: "intake" }, orderBy: { submittedAt: "desc" } })
    : null;
  const verified = attempt?.resultStatus === "active";

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-tint text-2xl text-brand-dark">✓</div>
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Your intake is submitted</h1>
        <p className="mt-2 text-ink-soft">
          {verified
            ? "Your insurance coverage was verified automatically. Our team will review your information and reach out to schedule your first appointment."
            : "Thank you. Our team will review your information and reach out to schedule. If you provided insurance, we will verify your benefits before your appointment."}
        </p>
      </div>
      <div className="rounded-card border border-line bg-white p-5 text-left text-sm text-ink-soft">
        <p className="font-medium text-brand-dark">What happens next?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A staff member confirms your details and benefits.</li>
          <li>We&rsquo;ll contact you at the phone/email you provided to schedule.</li>
          <li>Once you&rsquo;re set up, you&rsquo;ll get access to the secure Patient Portal.</li>
        </ul>
      </div>
      <p className="text-sm"><Link href="/" className="font-medium text-accent hover:underline">Return to homepage</Link></p>
      <p className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        If you are experiencing a mental health emergency, call <strong>911</strong> or <strong>988</strong>.
      </p>
    </div>
  );
}
