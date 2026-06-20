import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { allowedFormKeys, formKeyLabels } from "@/lib/submissions";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
};

export default async function SubmissionsQueue() {
  const session = await requireSession();
  const keys = allowedFormKeys(session.role);

  const submissions = keys.length
    ? await db.formSubmission.findMany({
        where: { formKey: { in: keys } },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Form submissions</h1>
        <p className="text-sm text-ink-soft">
          Payloads are encrypted at rest; details are decrypted only when opened, and every view is
          logged.
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Summary</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {submissions.map((s) => (
              <tr key={s.id} className="hover:bg-surface-alt">
                <td className="px-4 py-3 text-ink-soft">{s.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3">{formKeyLabels[s.formKey] ?? s.formKey}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/submissions/${s.id}`} className="font-medium text-brand-dark hover:underline">
                    {s.label}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[s.status]}`}>
                    {s.status.toLowerCase().replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
