import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createPage } from "./actions";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PagesList() {
  const session = await requireCapability("content:read");
  const canWrite = can(session.role, "content:write");
  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Pages</h1>
          <p className="text-sm text-ink-soft">Block-based pages with draft/publish and versioning.</p>
        </div>
        {canWrite && (
          <form action={createPage} className="flex items-end gap-2">
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-ink-soft">New page title</label>
              <input
                id="title"
                name="title"
                required
                placeholder="e.g. About Us"
                className="mt-1 rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
              Create
            </button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                  No pages yet. Create your first page above.
                </td>
              </tr>
            )}
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/admin/pages/${p.id}`} className="font-medium text-brand-dark hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">/{p.slug}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-ink-soft">{p.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
