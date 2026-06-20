import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { createProvider } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProvidersAdmin() {
  const session = await requireCapability("content:read");
  const canWrite = can(session.role, "providers:write");
  const providers = await db.provider.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Providers</h1>
          <p className="text-sm text-ink-soft">Structured provider profiles for the public site.</p>
        </div>
        {canWrite && (
          <form action={createProvider} className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-ink-soft">New provider name</label>
              <input name="name" required placeholder="e.g. Irfan Dahar" className="mt-1 rounded-lg border border-line px-3 py-2 text-sm" />
            </div>
            <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Create</button>
          </form>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {providers.map((p) => (
          <li key={p.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/admin/providers/${p.id}`} className="font-semibold text-brand-dark hover:underline">
                  {p.name}{p.credentials ? `, ${p.credentials}` : ""}
                </Link>
                {p.title && <p className="text-sm text-ink-soft">{p.title}</p>}
              </div>
              <StatusBadge status={p.status} />
            </div>
          </li>
        ))}
        {providers.length === 0 && <li className="text-sm text-ink-soft">No providers yet.</li>}
      </ul>
    </div>
  );
}
