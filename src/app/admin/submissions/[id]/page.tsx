import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, requireModule } from "@/lib/auth";
import { decryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { allowedFormKeys, formKeyLabels } from "@/lib/submissions";
import { updateSubmissionStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["NEW", "IN_PROGRESS", "CONTACTED", "ARCHIVED"] as const;
const fieldLabels: Record<string, string> = {
  name: "Full name",
  phone: "Phone",
  email: "Email",
  contactMethod: "Preferred contact method",
  location: "Preferred location",
  service: "Preferred service",
  dob: "Date of birth",
  provider: "Insurance provider",
  memberId: "Member ID",
  cardFileName: "Insurance card file",
  consent: "Consent",
};

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("appointment_requests");
  const session = await requireSession();
  const { id } = await params;

  const sub = await db.formSubmission.findUnique({ where: { id } });
  if (!sub) notFound();
  if (!allowedFormKeys(session.role).includes(sub.formKey)) {
    throw new Error("FORBIDDEN");
  }

  // Decrypting reveals submitted contact/insurance details — log the access.
  const payload = decryptJson<Record<string, string>>(sub.encryptedPayload);
  await audit({ sub: session.sub, email: session.email }, "submission.view", "FormSubmission", sub.id, {
    formKey: sub.formKey,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/submissions" className="text-sm text-brand-dark hover:underline">← All submissions</Link>

      <div>
        <h1 className="text-2xl font-bold text-brand-dark">{formKeyLabels[sub.formKey] ?? sub.formKey}</h1>
        <p className="text-sm text-ink-soft">Received {sub.createdAt.toLocaleString()}</p>
      </div>

      <dl className="divide-y divide-line rounded-card border border-line bg-white">
        {Object.entries(payload).map(([k, v]) => (
          <div key={k} className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm font-medium text-ink-soft">{fieldLabels[k] ?? k}</dt>
            <dd className="col-span-2 text-sm text-ink">{String(v)}</dd>
          </div>
        ))}
      </dl>

      <form action={updateSubmissionStatus} className="flex items-end gap-2">
        <input type="hidden" name="id" value={sub.id} />
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft">Status</span>
          <select name="status" defaultValue={sub.status} className="mt-1 rounded-lg border border-line px-3 py-2 text-sm">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.toLowerCase().replace("_", " ")}</option>
            ))}
          </select>
        </label>
        <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
          Update
        </button>
      </form>

      <p className="text-xs text-ink-soft">
        This record is stored encrypted (AES-256-GCM). Your access has been logged.
      </p>
    </div>
  );
}
