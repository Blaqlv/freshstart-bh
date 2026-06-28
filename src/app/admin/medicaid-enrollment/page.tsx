import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listCases, dashboardStats } from "@/lib/medicaid/cases";
import { completionPercent, CASE_STATUSES, CASE_TYPES } from "@/lib/medicaid/constants";

export const dynamic = "force-dynamic";

export default async function MedicaidDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; caseType?: string }>;
}) {
  const session = await requireCapability("enrollment:read");
  const sp = await searchParams;
  const [stats, cases] = await Promise.all([
    dashboardStats(),
    listCases({ status: sp.status, caseType: sp.caseType }),
  ]);
  const canManage = can(session.role, "enrollment:manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-dark">Medicaid Enrollment</h1>
        {canManage && (
          <Link href="/admin/medicaid-enrollment/new" className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white">
            New Case
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Active Cases", value: stats.active },
          { label: "Due This Month", value: stats.dueThisMonth },
          { label: "Pending Submission", value: stats.pendingSubmission },
          { label: "Approved This Year", value: stats.approvedThisYear },
        ].map((c) => (
          <div key={c.label} className="rounded-card border border-line bg-white p-4">
            <div className="text-2xl font-bold text-ink">{c.value}</div>
            <div className="text-xs text-ink-soft">{c.label}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap gap-3 text-sm">
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-line px-3 py-2">
          <option value="">All statuses</option>
          {CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="caseType" defaultValue={sp.caseType ?? ""} className="rounded-lg border border-line px-3 py-2">
          <option value="">All types</option>
          {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="rounded-lg border border-line px-3 py-2">Filter</button>
      </form>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Deadline</th>
              <th className="px-4 py-2">Progress</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-4 py-2">
                  <Link href={`/admin/medicaid-enrollment/${c.id}`} className="text-accent hover:underline">{c.providerName}</Link>
                </td>
                <td className="px-4 py-2">{c.caseType}</td>
                <td className="px-4 py-2">{c.status}</td>
                <td className="px-4 py-2">{c.targetDeadline ? new Date(c.targetDeadline).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-2">{completionPercent(c.checklistItems)}%</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-soft">No cases yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
