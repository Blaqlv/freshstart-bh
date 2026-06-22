# Phase C3a — Page-List Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side filter bar (template, status, sidebar, search) with URL-persisted state and count badges to the admin pages list.

**Architecture:** The server page keeps loading all pages and passes a serializable subset + initial filter values (from `searchParams`) to a new `PagesBrowser` client component, which filters in memory, renders the results table, and syncs filter state to the URL via `router.replace`.

**Tech Stack:** Next.js 16 (App Router, RSC + client components, `next/navigation`), React 19, Tailwind v4. No new dependencies.

**Depends on:** Phase A (`template`/`hasSidebar` on `Page`). This branch (`prompt-6-phase-c3a-page-filters`) is stacked on the C2 branch.

**Testing note:** No unit-test runner; the page is auth-gated. Verification is `npx tsc --noEmit`, `npm run build`, and lint; the interactive filter check is a human follow-up.

**Conventions:** brand tokens (`brand-dark`, `ink-soft`, `line`, `surface-alt`); reuse `StatusBadge` (`src/components/admin/StatusBadge.tsx`, a plain component usable in client code). Commit per task with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` footer.

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `src/components/admin/PagesBrowser.tsx` | Client filter bar + filtered table + URL sync | Create |
| `src/app/admin/pages/page.tsx` | Load pages, pass rows + initial filters to `PagesBrowser` | Modify |

---

## Task 1: PagesBrowser client component

**Files:** Create `src/components/admin/PagesBrowser.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";

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

export function PagesBrowser({ rows, initial }: { rows: PageRow[]; initial: PageFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [template, setTemplate] = useState(initial.template);
  const [status, setStatus] = useState(initial.status);
  const [sidebar, setSidebar] = useState(initial.sidebar);
  const [q, setQ] = useState(initial.q);

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
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/admin/PagesBrowser.tsx`
Expected: no errors. (The URL-sync `useEffect` only calls `router.replace` — it does not call `setState`, so it does not trip `react-hooks/set-state-in-effect`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/PagesBrowser.tsx
git commit -m "$(cat <<'EOF'
Add PagesBrowser client component with filters and URL sync

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire the filters into the pages list page

**Files:** Modify `src/app/admin/pages/page.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/app/admin/pages/page.tsx` with:

```tsx
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
```

(`Link` and `StatusBadge` are no longer imported here — they moved into `PagesBrowser`.)

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. (Prisma's `ContentStatus`/`PageTemplate` enum values match the `PageRow` string-literal unions, so the `rows` map is assignable.)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/pages/page.tsx
git commit -m "$(cat <<'EOF'
Render the pages list through PagesBrowser with filters

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Verification

**Files:** none modified.

- [ ] **Step 1: Lint both files**

Run: `npx eslint src/components/admin/PagesBrowser.tsx src/app/admin/pages/page.tsx`
Expected: no errors (warnings acceptable). Fix any errors before continuing.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: "Compiled successfully" — and `/admin/pages` appears in the route list.

- [ ] **Step 3: Human verification note (not a code step)**

`/admin/pages` is auth-gated, so verify manually: log in to `/admin`, open Pages, and confirm:
- The template / status / sidebar dropdowns and the search box appear above the table.
- Typing in search filters the table instantly (no page reload).
- Selecting a filter shows a count badge and updates the URL (`?template=…&status=…`).
- Copying the filtered URL into a new tab reproduces the same filtered view.
- Clearing all filters returns to the full list and a bare `/admin/pages` URL.

(No commit; report as a manual follow-up.)

---

## Self-review

**Spec coverage:**
- Template / status (incl. Archived) / sidebar dropdowns + live search → Task 1. ✔
- Client-side, immediate filtering (no round-trip) → Task 1 (`useMemo`). ✔
- Count badge on active filters → Task 1 (`count(...)` badges). ✔
- URL persistence + re-hydration from `searchParams` → Task 1 (`router.replace`) + Task 2 (`initial`). ✔
- Empty state → Task 1. ✔
- Header + create form preserved → Task 2. ✔
- `tsc`/`build`/lint verification → Tasks 1–3. ✔
- Out of scope (editor dnd/slide-overs/autosave, server-side filtering) → correctly absent. ✔

**Placeholder scan:** No TBD/TODO; full code + exact commands throughout. ✔

**Type consistency:** `PageRow`/`PageFilters` defined in Task 1 and consumed by Task 2's `rows`/`initial` props. `PagesBrowser({ rows, initial })` matches the call site `<PagesBrowser rows={rows} initial={initial} />`. `StatusBadge status={p.status}` receives the `ContentStatus`-equivalent union. The URL-sync effect calls only `router.replace` (no setState → no `set-state-in-effect` lint error). ✔
