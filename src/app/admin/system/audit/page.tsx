import Link from "next/link";
import { listSystemAudit } from "@/lib/system/registry";
import { formatAuditRow } from "@/lib/system/helpers";

export const dynamic = "force-dynamic";

export default async function SystemAuditPage() {
  const logs = await listSystemAudit(500);
  const rows = logs.map((l) => ({ id: l.id, ...formatAuditRow(l) }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">System configuration changes. Most recent 500 shown.</p>
        <Link href="/admin/system/audit/export" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt">Export CSV</Link>
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Changed by</th>
              <th className="px-4 py-3 font-medium">Previous</th>
              <th className="px-4 py-3 font-medium">New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-ink-soft">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 font-medium text-ink">{r.action}</td>
                <td className="px-4 py-2 text-ink-soft">{r.target}</td>
                <td className="px-4 py-2 text-ink-soft">{r.actorEmail ?? "system"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.prev}</td>
                <td className="px-4 py-2 text-ink-soft">{r.next}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No system changes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
