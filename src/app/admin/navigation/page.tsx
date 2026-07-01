import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { toggleNavItemVisibility, deleteNavItem } from "./actions";
import type { NavPlacement, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PLACEMENT_LABELS: Record<NavPlacement, string> = {
  TOP_NAV: "Top Navigation",
  FOOTER: "Footer",
  UTILITY_BAR: "Utility Bar",
};

type NavItemWithChildren = Prisma.NavigationItemGetPayload<{ include: { children: true } }>;

export default async function NavigationAdminPage() {
  const session = await requireCapability("content:read");
  const canWrite = can(session.role, "content:write");

  let items: NavItemWithChildren[] = [];
  let loadError: string | null = null;
  try {
    items = await db.navigationItem.findMany({
      orderBy: [{ placement: "asc" }, { footerColumn: "asc" }, { sortOrder: "asc" }],
      include: { children: { orderBy: { sortOrder: "asc" } } },
    });
  } catch (err) {
    console.error("[NavigationAdminPage] Failed to load navigation items:", err);
    loadError = err instanceof Error ? err.message : "Unknown database error";
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-red-800">Navigation builder unavailable</h2>
        <p className="text-sm text-red-700">
          There was a problem loading navigation data. This is usually caused by a pending
          database migration.
        </p>
        <p className="mt-2 font-mono text-sm text-red-700">Error: {loadError}</p>
      </div>
    );
  }

  const topNav = items.filter((i) => i.placement === "TOP_NAV" && !i.parentId);
  const footer = items.filter((i) => i.placement === "FOOTER");
  const utility = items.filter((i) => i.placement === "UTILITY_BAR");

  const sections: { title: string; items: typeof topNav }[] = [
    { title: PLACEMENT_LABELS.TOP_NAV, items: topNav },
    { title: PLACEMENT_LABELS.FOOTER, items: footer },
    { title: PLACEMENT_LABELS.UTILITY_BAR, items: utility },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Navigation</h1>
          <p className="text-sm text-ink-soft">Manage site navigation links and structure.</p>
        </div>
        {canWrite && (
          <Link
            href="/admin/navigation/new"
            className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90"
          >
            + Add Item
          </Link>
        )}
      </div>

      {sections.map(({ title, items: sectionItems }) => (
        <section key={title} className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
          {sectionItems.length === 0 ? (
            <p className="text-sm text-ink-soft">No items.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="pb-2 pr-4 font-medium">Label</th>
                  <th className="pb-2 pr-4 font-medium">Href</th>
                  <th className="pb-2 pr-4 font-medium">Children</th>
                  <th className="pb-2 font-medium">Status</th>
                  {canWrite && <th className="pb-2 pl-4 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sectionItems.map((item) => (
                  <tr key={item.id} className="py-2">
                    <td className="py-2 pr-4 font-medium text-ink">{item.label}</td>
                    <td className="py-2 pr-4 text-ink-soft">{item.href ?? <span className="italic text-ink-soft/60">—</span>}</td>
                    <td className="py-2 pr-4 text-ink-soft">
                      {item.children.length > 0 ? `${item.children.length} children` : "—"}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {item.isVisible ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="py-2 pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleNavItemVisibility.bind(null, item.id, !item.isVisible)}>
                            <button type="submit" className="text-xs text-brand-dark hover:underline">
                              {item.isVisible ? "Hide" : "Show"}
                            </button>
                          </form>
                          <form action={deleteNavItem.bind(null, item.id)} onSubmit={(e) => { if (!confirm(`Delete "${item.label}"?`)) e.preventDefault(); }}>
                            <button type="submit" className="text-xs text-red-600 hover:underline">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
