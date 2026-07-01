import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { toggleServiceActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  const session = await requireCapability("content:read");
  const canWrite = can(session.role, "content:write");

  const services = await db.service.findMany({
    orderBy: { sortOrder: "asc" },
    include: { page: { select: { id: true, status: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Services</h1>
          <p className="text-sm text-ink-soft">Manage service pages and content.</p>
        </div>
        {canWrite && (
          <Link
            href="/admin/services/new"
            className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90"
          >
            + Add Service
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Page</th>
              {canWrite && <th className="px-4 py-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {services.map((svc) => (
              <tr key={svc.id} className={svc.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-medium text-brand-dark">{svc.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{svc.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      svc.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-surface-alt text-ink-soft"
                    }`}
                  >
                    {svc.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {svc.page ? (
                    <Link href={`/admin/pages/${svc.page.id}`} className="text-brand-dark hover:underline">
                      {svc.page.status === "PUBLISHED" ? "Published" : "Draft"} →
                    </Link>
                  ) : (
                    <span className="text-ink-soft">No page</span>
                  )}
                </td>
                {canWrite && (
                  <td className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/admin/services/${svc.id}`} className="text-brand-dark hover:underline">
                      Edit
                    </Link>
                    <form action={toggleServiceActive.bind(null, svc.id, !svc.isActive)}>
                      <button type="submit" className="text-ink-soft hover:text-brand-dark">
                        {svc.isActive ? "Deactivate" : "Restore"}
                      </button>
                    </form>
                    {svc.page && (
                      <a
                        href={`/services/${svc.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-soft hover:text-brand-dark"
                      >
                        View ↗
                      </a>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
