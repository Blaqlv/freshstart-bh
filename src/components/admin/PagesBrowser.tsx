"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { duplicatePage } from "@/app/admin/pages/actions";

export type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  template: "SERVICE_DETAIL" | "GENERAL";
  hasSidebar: boolean;
  updated: string;
};

export type PageFilters = { template: string; status: string; sidebar: string; q: string };

const control = "rounded-lg border border-line px-3 py-2 text-sm";
const badge = "rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-ink-soft";

export function PagesBrowser({
  rows,
  initial,
  canWrite = false,
}: {
  rows: PageRow[];
  initial: PageFilters;
  canWrite?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [template, setTemplate] = useState(initial.template);
  const [status, setStatus] = useState(initial.status);
  const [sidebar, setSidebar] = useState(initial.sidebar);
  const [q, setQ] = useState(initial.q);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function handleDuplicate(pageId: string) {
    setDuplicatingId(pageId);
    try {
      const result = await duplicatePage(pageId);
      const suffix = result.wasServicePage ? "?duplicated=service" : "";
      router.push(`/admin/pages/${result.newPageId}${suffix}`);
    } catch (err) {
      console.warn("Duplicate failed", err);
    } finally {
      setDuplicatingId(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (template) params.set("template", template);
    if (status) params.set("status", status);
    if (sidebar) params.set("sidebar", sidebar);
    if (q) params.set("q", q);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [template, status, sidebar, q, pathname, router]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!template || r.template === template) &&
        (!status || r.status === status) &&
        (!sidebar || String(r.hasSidebar) === sidebar) &&
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          r.slug.toLowerCase().includes(needle)),
    );
  }, [rows, template, status, sidebar, q]);

  const count = (pred: (r: PageRow) => boolean) => rows.filter(pred).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <select aria-label="Filter by template" value={template} onChange={(e) => setTemplate(e.target.value)} className={control}>
            <option value="">All templates</option>
            <option value="SERVICE_DETAIL">Service Detail</option>
            <option value="GENERAL">General</option>
          </select>
          {template && <span className={badge}>{count((r) => r.template === template)}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={control}>
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          {status && <span className={badge}>{count((r) => r.status === status)}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <select aria-label="Filter by sidebar" value={sidebar} onChange={(e) => setSidebar(e.target.value)} className={control}>
            <option value="">All pages</option>
            <option value="true">With sidebar</option>
            <option value="false">Without sidebar</option>
          </select>
          {sidebar && <span className={badge}>{count((r) => String(r.hasSidebar) === sidebar)}</span>}
        </div>

        <input
          type="search"
          aria-label="Search pages"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pages…"
          className={`${control} flex-1 min-w-48`}
        />
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              {canWrite && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 5 : 4} className="px-4 py-8 text-center text-ink-soft">
                  No pages match these filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/admin/pages/${p.id}`} className="font-medium text-brand-dark hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">/{p.slug}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-ink-soft">{p.updated}</td>
                {canWrite && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(p.id)}
                      disabled={duplicatingId === p.id}
                      title="Duplicate this page as a draft"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-dark hover:underline disabled:opacity-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {duplicatingId === p.id ? "Duplicating…" : "Duplicate"}
                    </button>
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
