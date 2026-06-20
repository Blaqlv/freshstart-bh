import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireCapability("audit:read");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Audit log</h1>
        <p className="text-sm text-ink-soft">Append-only record of staff actions. Most recent 200 shown.</p>
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-ink-soft">{l.createdAt.toLocaleString()}</td>
                <td className="px-4 py-2">{l.actorEmail ?? "system"}</td>
                <td className="px-4 py-2 font-medium text-ink">{l.action}</td>
                <td className="px-4 py-2 text-ink-soft">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
