import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// A2 step 4: read-only log for Administrator, Compliance Officer, Receptionist.
const ALLOWED_ROLES = ["ADMINISTRATOR", "COMPLIANCE_OFFICER", "RECEPTIONIST"] as const;

// The Receptionist must not see the payload for insurance / intake form types.
const RESTRICTED_FROM_RECEPTIONIST = new Set(["insurance_verification", "intake"]);

const formTypeLabels: Record<string, string> = {
  appointment_request: "Appointment request",
  insurance_verification: "Insurance verification",
  contact: "Contact",
  review: "Review",
};

const statusStyles: Record<string, string> = {
  received: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  rejected: "bg-zinc-200 text-zinc-700",
  honeypot_triggered: "bg-red-100 text-red-800",
};

export default async function PublicSubmissionsLog() {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/forbidden");
  }
  const isReceptionist = session.role === "RECEPTIONIST";

  const rows = await db.publicFormSubmission.findMany({
    orderBy: { submittedAt: "desc" },
    take: 250,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Public form submissions log</h1>
        <p className="text-sm text-ink-soft">
          Immutable audit trail of public form activity. IP addresses are stored only as a one-way
          hash and sensitive fields are redacted. This view is read-only.
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Staff notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const restricted = isReceptionist && RESTRICTED_FROM_RECEPTIONIST.has(r.formType);
              return (
                <tr key={r.id} className="align-top hover:bg-surface-alt">
                  <td className="px-4 py-3 text-ink-soft">{r.submittedAt.toLocaleString()}</td>
                  <td className="px-4 py-3">{formTypeLabels[r.formType] ?? r.formType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusStyles[r.status] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {restricted ? (
                      <span className="italic text-zinc-500">Restricted</span>
                    ) : (
                      <code className="break-all text-xs">{JSON.stringify(r.payload)}</code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.staffNotes ?? "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No public form submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
