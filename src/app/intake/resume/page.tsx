import Link from "next/link";
import { redirect } from "next/navigation";
import { IntakeResume } from "@/components/intake/IntakeResume";
import { db } from "@/lib/db";
import { createIntakeSessionCookie, verifyResumeToken } from "@/lib/intake-auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // SMS resume link (E4): a valid signed token logs the patient straight back in
  // without exposing their id in the URL.
  const { token } = await searchParams;
  if (token) {
    const intakeId = await verifyResumeToken(token);
    if (intakeId) {
      const intake = await db.intakeSubmission.findUnique({ where: { id: intakeId } });
      if (intake && intake.status === "IN_PROGRESS") {
        await createIntakeSessionCookie(intakeId);
        await audit({ sub: intakeId, email: intake.email }, "intake.resume.token", "IntakeSubmission", intakeId);
        redirect("/intake/form");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Resume your intake</h1>
        <p className="mt-1 text-ink-soft">
          Enter the email you started with and the resume code we showed you.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <IntakeResume />
      </div>
      <p className="text-sm text-ink-soft">
        Lost your code? <Link href="/contact" className="font-medium text-accent hover:underline">Contact us</Link> and
        we&rsquo;ll help — or <Link href="/intake" className="font-medium text-accent hover:underline">start over</Link>.
      </p>
    </div>
  );
}
