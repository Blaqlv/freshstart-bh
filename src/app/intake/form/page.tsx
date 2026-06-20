import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getIntakeSession } from "@/lib/intake-auth";
import { decryptJson } from "@/lib/crypto";
import { INTAKE_STEPS, REVIEW_STEP_INDEX, TOTAL_STEPS } from "@/lib/intake";
import { IntakeStepForm } from "@/components/intake/IntakeStepForm";
import { IntakeReview } from "@/components/intake/IntakeReview";

export const dynamic = "force-dynamic";

export default async function IntakeFormPage() {
  const session = await getIntakeSession();
  if (!session) redirect("/intake");

  const intake = await db.intakeSubmission.findUnique({ where: { id: session.id } });
  if (!intake) redirect("/intake");
  if (intake.status === "SUBMITTED") redirect("/intake/complete");

  const data = decryptJson<Record<string, string>>(intake.dataEncrypted);
  const stepIndex = Math.min(Math.max(intake.currentStep, 0), REVIEW_STEP_INDEX);
  const stepNumber = stepIndex + 1;
  const pct = Math.round((stepIndex / REVIEW_STEP_INDEX) * 100);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {session.code && (
        <p className="rounded-card border border-line bg-surface-alt px-4 py-3 text-sm text-ink-soft">
          Your progress saves automatically. To finish later, use email{" "}
          <strong className="text-ink">{intake.email}</strong> and resume code{" "}
          <code className="rounded bg-white px-2 py-0.5 font-mono text-brand-dark">{session.code}</code>.
        </p>
      )}

      {stepIndex < REVIEW_STEP_INDEX ? (
        <IntakeStepForm
          step={INTAKE_STEPS[stepIndex]}
          values={data}
          stepNumber={stepNumber}
          totalSteps={TOTAL_STEPS}
        />
      ) : (
        <IntakeReview data={data} stepNumber={stepNumber} totalSteps={TOTAL_STEPS} />
      )}
    </div>
  );
}
