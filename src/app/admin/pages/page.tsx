import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createPage } from "./actions";
import { PagesBrowser } from "@/components/admin/PagesBrowser";

export const dynamic = "force-dynamic";

export default async function PagesList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireCapability("content:read");
  const canWrite = can(session.role, "content:write");
  const sp = await searchParams;

  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });
  const rows = pages.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    template: p.template,
    hasSidebar: p.hasSidebar,
    updated: p.updatedAt.toLocaleDateString(),
  }));
  const initial = {
    template: sp.template ?? "",
    status: sp.status ?? "",
    sidebar: sp.sidebar ?? "",
    q: sp.q ?? "",
  };

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

      <PagesBrowser rows={rows} initial={initial} />
    </div>
  );
}
