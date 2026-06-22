# Phase A — Rendering Foundation: Page Templates & New Content Blocks

**Date:** 2026-06-22
**Status:** Approved (design)
**Source:** Adapted from `prompt-6-page-templates-and-content-blocks.md`

## Context

Prompt 6 specifies a CMS page-builder system. It was written against an imagined
"v1 CMS" architecture (relational `ContentBlock` table, UPPERCASE `BlockType`/
`PageTemplate` enums, `status` strings, `publishedAt`, a `ServicePage` model, TinyMCE,
root-level `lib/`/`components/`). The actual repository diverges fundamentally:

- Blocks are stored as a **JSON array inside `PageVersion.blocks`** (versioned), not a
  relational table. Discriminator is a camelCase string `type`. 8 existing block types
  live in a `blockRegistry` in `src/lib/cms/blocks.ts`.
- `Page` uses versioning (`publishedVersion`, `PageVersion[]`); `status` is the
  `ContentStatus` enum (`DRAFT`/`PUBLISHED`/`ARCHIVED`).
- Services are a separate `Service` model rendered by `src/app/(site)/services/[slug]/page.tsx`
  — **not** `Page` records.
- Source lives under `src/`. A catch-all `(site)/[...slug]/page.tsx`, `BlockRenderer.tsx`,
  `PageEditor.tsx`, and an admin pages editor at `admin/pages/[id]` already exist.
- Rich-text bodies render as plain paragraphs (split on blank lines) — no HTML, no
  sanitization today.

**Decision (user-approved):** adapt Prompt 6 to the existing architecture rather than
introduce a parallel relational block system. The full prompt is decomposed into three
phases; this spec covers **Phase A only** (rendering foundation). Phase B (TinyMCE rich
text) and Phase C (admin page-builder UX) get their own spec → plan → build cycles.

## Goal

A CMS `Page` can declare a template (`SERVICE_DETAIL` or `GENERAL`) and optionally a
sidebar, and can use 7 new content block types. The public catch-all route renders pages
through the correct template shell. End-to-end visible result: pages render with the new
blocks and the service-style sidebar — without the admin-UX polish (deferred to Phase C).

## Scope

### In scope (Phase A)
1. Schema: `PageTemplate` enum + `template`/`hasSidebar` fields on `Page` + migration.
2. 7 new block types in `src/lib/cms/blocks.ts` (existing camelCase-string style).
3. 7 new block render components + `BlockRenderer` dispatch.
4. `ServiceSidebar` component.
5. `ServiceDetailTemplate` + `GeneralTemplate` shells.
6. Catch-all route dispatches to the correct template by `page.template`.
7. Add `lucide-react` dependency (for `iconList`).

### Out of scope (later phases / dropped)
- TinyMCE, HTML bodies, DOMPurify sanitization → **Phase B**.
- Admin page-builder UX: dnd-kit reordering, block picker slide-over, per-block editor
  panels, icon picker, media picker, autosave, page-list filters, publish polish,
  block-picker SVG thumbnails → **Phase C**.
- The prompt's `scripts/migrate-service-pages-to-template.ts` → **dropped**: services are
  not `Page` records, so there is nothing to migrate. Existing `Page` records correctly
  default to `GENERAL` / `hasSidebar: false`.
- The prompt's `?preview=true` query flow → **dropped for Phase A**: draft preview already
  exists at `admin/pages/[id]/preview`.

## Design

### 1. Data model (`prisma/schema.prisma`)

```prisma
enum PageTemplate {
  SERVICE_DETAIL
  GENERAL
}

model Page {
  // ... existing fields unchanged ...
  template   PageTemplate @default(GENERAL)
  hasSidebar Boolean      @default(false) // GENERAL only; SERVICE_DETAIL renders sidebar regardless
}
```

Migration name: `page-templates`. No data backfill needed — defaults are correct.

### 2. Block types (`src/lib/cms/blocks.ts`)

Add 7 types to the `BlockType` union, a discriminated type for each, entries in the
`Block` union, and `blockRegistry` entries with `label`, `description`, and `create()`
defaults. Naming follows existing convention (camelCase string literals):

| New type            | Key fields (trimmed from prompt) |
|---------------------|----------------------------------|
| `numberedList`      | `title?`, `intro?`, `items:{heading, body?}[]`, `numberStyle?: 'circle'\|'square'\|'plain'`, `columns?: 1\|2` |
| `iconList`          | `title?`, `intro?`, `items:{icon, label, body?}[]`, `iconColor?`, `columns?: 1\|2\|3` |
| `richTextColumns`   | `heading?`, `intro?`, `columns:{title?, body}[]`, `dividers?: boolean` |
| `imageLeftTextRight`| `image:{url, alt}`, `title`, `body`, `ctaLabel?`, `ctaHref?`, `imageWidthPercent?: 40\|45\|50` |
| `imageRightTextLeft`| same fields as `imageLeftTextRight` |
| `imageTitleBelow`   | `image:{url, alt}`, `title`, `caption?`, `aspectRatio?: '16/9'\|'4/3'\|'1/1'\|'3/2'`, `maxWidth?: 'sm'\|'md'\|'lg'\|'full'` |
| `imageTitleBeside`  | `image:{url, alt}`, `imagePosition: 'left'\|'right'`, `title`, `body`, `imageSize?: 'sm'\|'md'\|'lg'`, `verticalAlign?: 'top'\|'center'` |

`intro`/`body`/`caption` are plain strings rendered as paragraphs in Phase A (see §3).

### 3. Renderer (`src/components/cms/`)

`BlockRenderer.tsx` is currently one switch. To keep files focused, extract the 7 new
blocks into `src/components/cms/blocks/<Name>Block.tsx` and dispatch from `BlockRenderer`
(existing 8 blocks may stay in the switch; new ones delegate). Conventions to reuse:
- Server components; `Container`, `Button`, `Link`, brand tokens (`brand-dark`,
  `ink-soft`, `line`, `surface-alt`, `gold`, `rounded-card`).
- Images via `next/image` with `fill` + `object-cover` inside relative containers.
- **Body/intro/caption text rendered as plain paragraphs** (`body.split(/\n\s*\n/)` →
  `<p>`), mirroring the existing `richText` block. No `dangerouslySetInnerHTML`, no
  DOMPurify in Phase A.
- `iconList` resolves icons via a safe resolver over `lucide-react`:
  ```ts
  // src/lib/cms/resolveIcon.ts
  import * as icons from "lucide-react";
  export function resolveIcon(name: string): React.ElementType {
    return (icons as Record<string, React.ElementType>)[name] ?? icons.Circle;
  }
  ```
- Responsive: image+text splits stack image-above-text on mobile (both left and right
  variants share the same mobile order); multi-column blocks collapse to one column on
  mobile.

Add `lucide-react` to dependencies.

### 4. Sidebar + template shells

**`src/components/cms/ServiceSidebar.tsx`** (server component). Static content sourced
from `src/lib/site.ts` (the in-sync source of truth standing in for the prompt's
nonexistent CMS settings record):
- "Ready to Get Started?" heading.
- "Book an Assessment" button → `/intake`.
- "Request Information" button → `#contact-form`.
- Phone: `site.phone` as a `tel:` link (`site.phoneHref`).
- Accepted insurance summary from `acceptedInsurance`.
- Related services: **derive 3 other published `Service` records** (e.g. ordered by
  `order`, excluding the current page where applicable), rendered as cards. No schema
  change. (Alternative considered: add `relatedServiceIds String[]` — rejected to avoid
  schema churn in Phase A.)

**`src/components/templates/ServiceDetailTemplate.tsx`**: CSS grid, ~320px sidebar +
fluid content, `gap-12`; sidebar stacks below content on mobile. Renders
`<BlockRenderer>` in the main column, `<ServiceSidebar>` on the right, and the existing
`AppointmentForm` pinned below the blocks (anchored `#contact-form`). Prompt's
`AppointmentRequestForm` maps to the existing `AppointmentForm`.

**`src/components/templates/GeneralTemplate.tsx`**: if `page.hasSidebar`, same two-column
layout; otherwise full-width `<BlockRenderer>`. No pinned form.

### 5. Catch-all route (`src/app/(site)/[...slug]/page.tsx`)

Keep existing logic (async `params`, `force-dynamic`, published-version resolution via
`parseBlocks`). After resolving `blocks`, dispatch:
```tsx
if (page.template === "SERVICE_DETAIL")
  return <ServiceDetailTemplate page={page} blocks={blocks} />;
return <GeneralTemplate page={page} blocks={blocks} />;
```

## Risks / notes

- Adding `template`/`hasSidebar` to `Page` is additive and safe; no existing rendering
  breaks (defaults preserve current behavior — `GENERAL`, no sidebar, full-width).
- Phase A blocks authored via the existing JSON editor (`PageEditor`) will work with raw
  JSON until Phase C adds proper forms; this is acceptable for a foundation phase.
- When Phase B introduces TinyMCE/HTML, the plain-paragraph body rendering in these
  components is swapped for sanitized HTML — block field shapes do not change.

## Acceptance criteria

- [ ] `PageTemplate` enum + `template`/`hasSidebar` migrated; existing pages unaffected.
- [ ] 7 new block types defined in `blocks.ts` with registry entries + `create()` defaults.
- [ ] 7 new block components render correctly, reusing existing UI primitives/tokens.
- [ ] `iconList` resolves Lucide icons by name with a safe fallback.
- [ ] `ServiceSidebar` renders phone, insurance, CTAs, and 3 derived related services.
- [ ] `ServiceDetailTemplate` renders sidebar + canvas + pinned `AppointmentForm`.
- [ ] `GeneralTemplate` respects `hasSidebar`.
- [ ] Catch-all dispatches to the correct template by `page.template`.
- [ ] `npm run build` / lint pass.
