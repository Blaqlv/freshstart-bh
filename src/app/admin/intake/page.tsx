import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability, requireModule } from "@/lib/auth";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-green-100 text-green-800",
};

export default async function IntakeQueue() {
  await requireModule("intake_portal");
  // Front-desk / admin triage. Same capability that guards appointment requests.
  await requireCapability("appointments:read");
  const intakes = await db.intakeSubmission.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">New patient intakes</h1>
        <p className="text-sm text-ink-soft">
          Intake answers are encrypted at rest; details are decrypted only when opened, and every
          view is logged.
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {intakes.map((i) => (
              <tr key={i.id} className="hover:bg-surface-alt">
                <td className="px-4 py-3 text-ink-soft">{i.updatedAt.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/intake/${i.id}`} className="font-medium text-brand-dark hover:underline">
                    {i.email}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[i.status]}`}>
                    {i.status.toLowerCase().replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {i.submittedAt ? i.submittedAt.toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {intakes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">No intakes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
