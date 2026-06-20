import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { decryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { INTAKE_STEPS } from "@/lib/intake";

export const dynamic = "force-dynamic";

export default async function IntakeDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("appointments:read");
  const { id } = await params;

  const intake = await db.intakeSubmission.findUnique({ where: { id } });
  if (!intake) notFound();

  // Decrypting reveals demographics + clinical history — log the access.
  const data = decryptJson<Record<string, string>>(intake.dataEncrypted);
  await audit({ sub: session.sub, email: session.email }, "intake.view", "IntakeSubmission", intake.id, {
    status: intake.status,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/intake" className="text-sm text-brand-dark hover:underline">← All intakes</Link>

      <div>
        <h1 className="text-2xl font-bold text-brand-dark">{intake.email}</h1>
        <p className="text-sm text-ink-soft">
          {intake.status === "SUBMITTED"
            ? `Submitted ${intake.submittedAt?.toLocaleString()}`
            : "In progress (not yet submitted)"}
        </p>
      </div>

      {INTAKE_STEPS.map((step) => (
        <section key={step.key}>
          <h2 className="mb-2 font-semibold text-brand-dark">{step.title}</h2>
          <dl className="divide-y divide-line rounded-card border border-line bg-white">
            {step.fields.map((f) => (
              <div key={f.name} className="grid grid-cols-3 gap-4 px-4 py-3">
                <dt className="text-sm font-medium text-ink-soft">{f.label}</dt>
                <dd className="col-span-2 text-sm text-ink">
                  {data[f.name] ? data[f.name] : <span className="text-ink-soft">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {intake.signedName && (
        <section className="rounded-card border border-brand bg-brand-tint p-4">
          <h2 className="font-semibold text-brand-dark">Electronic signature</h2>
          <p className="mt-1 text-sm text-ink">
            Signed by <strong>{intake.signedName}</strong> on {intake.signedAt?.toLocaleString()}.
          </p>
        </section>
      )}

      <p className="text-xs text-ink-soft">
        This record is stored encrypted (AES-256-GCM). Your access has been logged.
      </p>
    </div>
  );
}
