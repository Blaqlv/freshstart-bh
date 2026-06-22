# Phase C3a — Page-List Filters: Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Source:** Part 6.4 of `prompt-6-page-templates-and-content-blocks.md` (page filter bar),
first slice of the decomposed Phase C3.
**Depends on:** Phase A (`template`/`hasSidebar` on `Page`). This branch
(`prompt-6-phase-c3a-page-filters`) is stacked on the C2 branch.

## Context

`src/app/admin/pages/page.tsx` is a server component (`force-dynamic`) that lists all
pages in a plain table. There is no way to filter or search. This slice adds a filter bar
(template, status, sidebar, search) with URL-persisted state and count badges.

The remaining Phase C3 work — dnd-kit reorder, block-picker/block-editor slide-overs, SVG
thumbnails, autosave — is **C3b** and is out of scope here.

## Decisions (user-approved)

1. **Client-side filtering.** The prompt requires real-time search ("no round-trip for
   typing") and shareable/persisted URL state. The server keeps loading all pages and
   passes them to a client component that filters in memory and syncs to the URL. Admin
   page counts are small, so loading all is fine.
2. **Status filter includes Archived** (the `ContentStatus` enum has
   `PUBLISHED`/`DRAFT`/`ARCHIVED`).

## Goal

An admin can narrow the pages list by template, status, and sidebar, and search by title
or slug in real time; the filtered view is reflected in the URL so it survives refresh and
is shareable.

## Scope

### In scope
1. A client `PagesBrowser` component: filter bar + results table, in-memory filtering,
   URL state sync, count badges, empty state.
2. `admin/pages/page.tsx` passes the (serializable) page list + initial filter values
   (read from `searchParams`) into `PagesBrowser`; keeps the header + create form.

### Out of scope (C3b / later)
- All editor changes (dnd reorder, block picker, slide-overs, autosave, duplicate/insert).
- Server-side/paginated filtering (not needed at this scale).

## Design

### 1. `src/app/admin/pages/page.tsx` (server)

- Keep the `requireCapability("content:read")` gate, the heading, and the `canWrite`
  "New page" create form (server action `createPage`) exactly as-is.
- Accept `searchParams` (Next 16: `searchParams: Promise<Record<string, string | undefined>>`),
  await it, and derive initial filter values.
- Load pages as today (`db.page.findMany({ orderBy: { updatedAt: "desc" } })`), then map to
  a serializable shape and render `<PagesBrowser>`:
  ```tsx
  const rows = pages.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,            // ContentStatus
    template: p.template,        // PageTemplate
    hasSidebar: p.hasSidebar,
    updated: p.updatedAt.toLocaleDateString(),
  }));
  ```
  (`updated` is a preformatted string so no `Date` crosses the server→client boundary.)
- The existing inline `<table>` moves into `PagesBrowser`; `page.tsx` no longer renders it.

### 2. `src/components/admin/PagesBrowser.tsx` (new, client)

`"use client"`. Props:
```ts
type Row = {
  id: string; title: string; slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  template: "SERVICE_DETAIL" | "GENERAL";
  hasSidebar: boolean; updated: string;
};
type Initial = { template: string; status: string; sidebar: string; q: string };
function PagesBrowser({ rows, initial }: { rows: Row[]; initial: Initial }): JSX.Element
```

State (seeded from `initial`): `template` (`""|"SERVICE_DETAIL"|"GENERAL"`), `status`
(`""|"PUBLISHED"|"DRAFT"|"ARCHIVED"`), `sidebar` (`""|"true"|"false"`), `q` (string).

**Filtering** (`useMemo` over `rows`):
- template: `!template || row.template === template`
- status: `!status || row.status === status`
- sidebar: `!sidebar || String(row.hasSidebar) === sidebar`
- q: `!q || row.title.toLowerCase().includes(q.toLowerCase()) || row.slug.toLowerCase().includes(q.toLowerCase())`

**URL sync:** a `useEffect` on the four state values builds a query string (omitting empty
values) and calls `router.replace(\`/admin/pages${qs ? "?" + qs : ""}\`, { scroll: false })`
(`useRouter`, `usePathname` from `next/navigation`). Re-hydration is via `initial` (from
the server's `searchParams`), so a shared URL renders filtered.

**Filter bar UI:** three `<select>` dropdowns + one search `<input>`, styled with the
existing border/input classes. Each dropdown shows a **count badge** of matches for its
active (non-default) value, e.g. label `Service Detail (14)`. Counts are computed from
`rows` against that single dimension.

**Table:** same columns as today (Title link → `/admin/pages/<id>`, Slug, Status via
`StatusBadge`, Updated), rendered from the filtered list, with an empty-state row
("No pages match these filters.") when the filtered list is empty.

`StatusBadge` (`src/components/admin/StatusBadge.tsx`) is a plain component and is reused
directly in this client component.

## Risks / notes

- In-memory filtering is appropriate only because the admin page list is small; if it ever
  grows large, switch to server-side `where`-clause filtering driven by `searchParams`
  (the URL contract stays the same).
- No schema/migration/server-action change. No new dependencies.
- The page list is auth-gated, so the interactive check is a manual follow-up;
  `tsc`/`build`/lint are automated.

## Acceptance criteria

- [ ] Template, status, and sidebar dropdowns + a live search input appear above the table.
- [ ] Filtering is client-side and immediate (search has no round-trip).
- [ ] Active (non-default) filters show a count badge of matches.
- [ ] Filter state serializes to URL query params and re-hydrates from them on load
      (shareable, survives refresh).
- [ ] The table shows an empty state when nothing matches.
- [ ] The header and "New page" create form still work.
- [ ] `npx tsc --noEmit` and `npm run build` pass.
