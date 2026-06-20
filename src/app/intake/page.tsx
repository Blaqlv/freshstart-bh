import Link from "next/link";
import { redirect } from "next/navigation";
import { getIntakeId } from "@/lib/intake-auth";
import { db } from "@/lib/db";
import { IntakeStart } from "@/components/intake/IntakeStart";

export const dynamic = "force-dynamic";

export default async function IntakeLanding() {
  // If they already have an in-progress intake, take them straight back to it.
  const id = await getIntakeId();
  if (id) {
    const intake = await db.intakeSubmission.findUnique({ where: { id }, select: { status: true } });
    if (intake && intake.status === "IN_PROGRESS") redirect("/intake/form");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-dark">Welcome — let&rsquo;s get you started</h1>
        <p className="mt-2 text-ink-soft">
          This secure intake collects the information your care team needs before your first visit.
          It takes about 10–15 minutes. You can <strong>save and finish later</strong> — we&rsquo;ll give
          you a resume code.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-brand-dark">Start a new intake</h2>
        <p className="mt-1 text-sm text-ink-soft">Enter your email to begin.</p>
        <IntakeStart />
      </div>

      <div className="rounded-card border border-line bg-surface-alt p-5 text-sm">
        <p className="font-medium text-brand-dark">Already started?</p>
        <p className="mt-1 text-ink-soft">
          <Link href="/intake/resume" className="font-medium text-accent hover:underline">
            Resume your intake
          </Link>{" "}
          with your email and resume code.
        </p>
      </div>

      <p className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Not an emergency?</strong> If you are in crisis, call <strong>911</strong> or{" "}
        <strong>988</strong> (Suicide &amp; Crisis Lifeline). Do not use this form for emergencies.
      </p>
    </div>
  );
}
