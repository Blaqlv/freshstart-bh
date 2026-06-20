import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { createIncident, updateIncident } from "./actions";

export const dynamic = "force-dynamic";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED"] as const;
const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

const sevStyle: Record<string, string> = {
  LOW: "bg-zinc-200 text-zinc-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default async function IncidentsAdmin() {
  await requireCapability("incidents:manage");
  const incidents = await db.incidentReport.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Incident reporting</h1>
        <p className="text-sm text-ink-soft">Log and track compliance, safety, and quality incidents.</p>
      </div>

      <form action={createIncident} className="grid gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-ink-soft">Title</span>
          <input name="title" required className={input} /></label>
        <label className="block"><span className="text-xs font-medium text-ink-soft">Category</span>
          <input name="category" placeholder="e.g. Privacy, Safety, Quality" className={input} /></label>
        <label className="block"><span className="text-xs font-medium text-ink-soft">Severity</span>
          <select name="severity" defaultValue="MEDIUM" className={input}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></label>
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-ink-soft">Description</span>
          <textarea name="description" required rows={3} className={input} /></label>
        <div className="sm:col-span-2">
          <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Log incident</button>
        </div>
      </form>

      <ul className="space-y-3">
        {incidents.map((i) => (
          <li key={i.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sevStyle[i.severity]}`}>{i.severity}</span>
                  <h2 className="font-semibold text-brand-dark">{i.title}</h2>
                </div>
                {i.category && <p className="mt-1 text-xs text-ink-soft">{i.category}</p>}
                <p className="mt-2 text-sm text-ink-soft">{i.description}</p>
                <p className="mt-2 text-xs text-ink-soft">
                  Reported by {i.reportedByEmail ?? "—"} · {i.createdAt.toLocaleString()}
                </p>
              </div>
              <form action={updateIncident} className="flex shrink-0 flex-col items-end gap-2">
                <input type="hidden" name="id" value={i.id} />
                <select name="status" defaultValue={i.status} className="rounded border border-line px-2 py-1 text-xs">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                </select>
                <input name="resolution" defaultValue={i.resolution ?? ""} placeholder="Resolution notes" className="w-48 rounded border border-line px-2 py-1 text-xs" />
                <button className="text-xs font-medium text-brand-dark hover:underline">Update</button>
              </form>
            </div>
          </li>
        ))}
        {incidents.length === 0 && <li className="text-sm text-ink-soft">No incidents logged.</li>}
      </ul>
    </div>
  );
}
