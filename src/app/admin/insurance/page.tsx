// src/app/admin/insurance/page.tsx
import { requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { EligibilitySandboxBanner } from "@/components/EligibilitySandboxBanner";
import { setReviewedAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-amber-100 text-amber-800",
  unknown: "bg-gray-100 text-gray-700",
  api_error: "bg-red-100 text-red-800",
};

export default async function InsuranceQueue() {
  await requireCapability("billing:manage");
  const attempts = await db.verificationAttempt.findMany({
    where: { source: "insurance_form" },
    orderBy: { submittedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">Insurance verification</h1>
      <EligibilitySandboxBanner />
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Insurer</th>
              <th className="px-4 py-2">Result</th>
              <th className="px-4 py-2">Reviewed</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="px-4 py-2">{new Date(a.submittedAt).toLocaleString()}</td>
                <td className="px-4 py-2">{a.insurerName}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[a.resultStatus] ?? ""}`}>{a.resultStatus}</span>
                </td>
                <td className="px-4 py-2">{a.staffReviewed ? "Yes" : "No"}</td>
                <td className="px-4 py-2">
                  <form action={setReviewedAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="reviewed" value={(!a.staffReviewed).toString()} />
                    <button className="text-accent hover:underline">{a.staffReviewed ? "Flag for manual review" : "Mark reviewed"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {attempts.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-soft">No verification attempts yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-soft">Encrypted submission details (member ID, DOB) live in Form submissions for staff follow-up. This view never stores PHI.</p>
    </div>
  );
}
