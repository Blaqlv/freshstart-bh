import Link from "next/link";

export const dynamic = "force-dynamic";

export default function IntakeComplete() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-tint text-2xl text-brand-dark">
        ✓
      </div>
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Your intake is submitted</h1>
        <p className="mt-2 text-ink-soft">
          Thank you. Our team will review your information and reach out to schedule your first
          appointment. If you provided insurance, we&rsquo;ll verify your benefits before your visit.
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
      <p className="text-sm">
        <Link href="/" className="font-medium text-accent hover:underline">Return to homepage</Link>
      </p>
      <p className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        If you are experiencing a mental health emergency, call <strong>911</strong> or{" "}
        <strong>988</strong>.
      </p>
    </div>
  );
}
