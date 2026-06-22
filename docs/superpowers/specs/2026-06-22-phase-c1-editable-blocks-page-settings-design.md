# Phase C1 — Editable Blocks & Page Settings: Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Source:** Part 6 of `prompt-6-page-templates-and-content-blocks.md` (admin CMS),
first slice of the decomposed Phase C.
**Depends on:** Phase A (`template`/`hasSidebar` columns, the 7 new block types) and
Phase B (`RichTextEditor`). This branch (`prompt-6-phase-c1-block-forms`) is stacked on
the Phase B branch.

## Context

Phase C (the admin page-builder) is too large for one spec, so it is decomposed:
- **C1 (this spec):** make every block fully editable and persist page template/sidebar.
- **C2:** media + icon picker modals and the media upload/list endpoints.
- **C3:** rich builder UX (dnd reorder, slide-over panels, SVG thumbnails, autosave,
  list filters).

Current state of the admin editor:
- `src/components/admin/PageEditor.tsx` edits blocks inline via a `BlockFields` switch and
  serializes blocks to a hidden `blocks` JSON input; it saves through the `savePage` /
  `publishPage` server actions in `src/app/admin/pages/actions.ts`.
- **Gaps C1 closes:**
  1. `persistDraft` does not read/save `template` or `hasSidebar` — Phase A added the
     columns but nothing in the editor sets them.
  2. `BlockFields` only has forms for the old 8 block types; the 7 new Phase A blocks can
     be added but not configured (the switch falls through to no fields).
  3. There is no per-block visibility control.
- RBAC is already enforced at the action level (`requireCapability("content:write")` for
  edits, `content:publish` for publish/unpublish). C1 changes nothing here.

## Decisions (user-approved)

1. **Slug stays non-editable.** Changing a slug silently breaks URLs/redirects/SEO; not
   worth the risk. Slug is set at page creation only (unchanged).
2. **Repeatable-item reorder via ↑/↓ buttons**, mirroring the existing block-level move
   controls (drag-and-drop is C3).
3. **Plain inputs for icon and image fields in C1:** icon = a Lucide-name text input;
   image = URL text input + alt text input. The visual IconPicker/MediaPicker are C2.
4. **`isVisible` added to the block type** via a single intersection on the `Block` union
   (keeps discriminated-union narrowing intact).

## Goal

A non-technical admin can, in the existing page editor, choose a page's template and
sidebar, configure every one of the 15 block types through real form fields, and hide a
block without deleting it — all persisted via the existing save/publish flow.

## Scope

### In scope
1. Page settings: Template radio + conditional Sidebar toggle in `PageEditor`; persist both
   in `persistDraft`; add an Unpublish button when published.
2. Edit forms in `BlockFields` for the 7 new block types (`numberedList`, `iconList`,
   `richTextColumns`, `imageLeftTextRight`, `imageRightTextLeft`, `imageTitleBelow`,
   `imageTitleBeside`), using `RichTextEditor` for rich fields and ↑/↓ for repeatable items.
3. Per-block `isVisible`: type field, editor toggle + hidden styling, renderer filter.

### Out of scope (later / deliberately not done)
- Slug editing → dropped (decision 1).
- Drag-and-drop reorder, block-picker/block-editor slide-overs, SVG thumbnails, autosave,
  "saved X ago", list filters → **C3**.
- IconPicker, MediaPicker, media endpoints, TinyMCE inline-image upload → **C2**.
- Meta-description character counter → cosmetic, deferred to C3.

## Design

### 1. Page settings (`PageEditor.tsx` + `actions.ts`)

Add to the editor form (near the title field), as controlled React state seeded from the
page record:
- **Template** — radio group (`SERVICE_DETAIL` = "Service Detail page", `GENERAL` =
  "General page"), submitted as a hidden/`name="template"` value.
- **Include sidebar** — toggle (`name="hasSidebar"`, value `"true"`/`"false"`), rendered
  only when template is `GENERAL`. Label: "Show sidebar with contact CTAs and insurance
  information." (For `SERVICE_DETAIL`, the sidebar always renders, so the toggle is hidden.)

`PageData` (the prop passed into `PageEditor` from `src/app/admin/pages/[id]/page.tsx`)
gains `template: PageTemplate` and `hasSidebar: boolean`; the route already loads the full
`Page`, so it just passes the two fields through.

`persistDraft` in `actions.ts` reads the two new fields and includes them in the
`db.page.update`:
```ts
template: (String(formData.get("template")) === "SERVICE_DETAIL"
  ? "SERVICE_DETAIL" : "GENERAL"),
hasSidebar: String(formData.get("hasSidebar")) === "true",
```
(Validated explicitly rather than cast, so a bad value can't reach the enum column.)

**Unpublish button:** in the editor header, when `page.status === "PUBLISHED"` and the user
`canPublish`, render a button with `formAction={unpublishPage}` (the action already exists).
Import `unpublishPage` alongside `savePage`/`publishPage`.

### 2. Block edit forms (`BlockFields` in `PageEditor.tsx`)

Extend the `switch (block.type)` with a case per new type. Reuse the existing `Field`
(text input) and `RichField` (Phase B `RichTextEditor`) helpers; add a small repeatable-item
helper pattern (mirroring the existing `faqAccordion` case) with **Add / Remove / ↑ / ↓**
controls. Field maps:

- **numberedList:** `title` (Field), `intro` (RichField minimal), `numberStyle` (radio:
  circle/square/plain), `columns` (radio: 1/2), repeatable `items[]` each with `heading`
  (Field) + `body` (RichField minimal).
- **iconList:** `title` (Field), `intro` (RichField minimal), `iconColor` (Field — hex/token,
  optional), `columns` (radio: 1/2/3), repeatable `items[]` each with `icon` (Field — Lucide
  name, e.g. `CheckCircle2`), `label` (Field), `body` (RichField minimal).
- **richTextColumns:** `heading` (Field), `intro` (RichField full), `dividers` (toggle),
  repeatable `columns[]` each with `title` (Field) + `body` (RichField full).
- **imageLeftTextRight / imageRightTextLeft:** `image.url` (Field), `image.alt` (Field),
  `imageWidthPercent` (radio: 40/45/50), `title` (Field), `body` (RichField full),
  `ctaLabel` (Field), `ctaHref` (Field).
- **imageTitleBelow:** `image.url` (Field), `image.alt` (Field), `aspectRatio` (radio:
  16/9, 4/3, 1/1, 3/2), `maxWidth` (radio: sm/md/lg/full), `title` (Field), `caption`
  (RichField minimal).
- **imageTitleBeside:** `image.url` (Field), `image.alt` (Field), `imagePosition` (radio:
  left/right), `imageSize` (radio: sm/md/lg), `verticalAlign` (radio: top/center), `title`
  (Field), `body` (RichField full).

Nested updates (image object, items/columns arrays) follow the existing immutable-patch
style already used by `faqAccordion` (`onChange({ items: block.items.map(...) })`). Add a
small `Radio` helper (label + radio group) and a `Toggle` helper to keep the new cases DRY.

### 3. Per-block visibility (`blocks.ts`, `PageEditor.tsx`, `BlockRenderer.tsx`)

- **Type:** change the `Block` union to carry an optional flag:
  ```ts
  export type Block = (
    | HeroBlock | RichTextBlock | FaqAccordionBlock | ServiceGridBlock
    | TestimonialCarouselBlock | LocationGridBlock | TeamGridBlock | CtaBannerBlock
    | NumberedListBlock | IconListBlock | RichTextColumnsBlock
    | ImageLeftTextRightBlock | ImageRightTextLeftBlock
    | ImageTitleBelowBlock | ImageTitleBesideBlock
  ) & { isVisible?: boolean };
  ```
  `undefined`/`true` = visible; `false` = hidden. Distribution over the union preserves
  `type`-based narrowing in both the renderer switch and `BlockFields`.
- **Editor:** add an eye/eye-off toggle button to each block card header that calls
  `update(i, { isVisible: block.isVisible === false } )` (flip). When hidden, style the card
  with reduced opacity + a "Hidden" marker so the admin sees it won't show publicly.
- **Renderer:** in `BlockRenderer`, filter before mapping:
  `blocks.filter((b) => b.isVisible !== false)`.

## Risks / notes

- The `Block`-union intersection is the only type-shape change; existing block components
  that accept a specific block type (e.g. `NumberedListBlock`) keep working because the
  extra optional `isVisible` is assignable.
- No schema/migration change — `isVisible` lives in the existing `PageVersion.blocks` JSON;
  `template`/`hasSidebar` columns already exist from Phase A.
- No DB-write tasks beyond what the editor already does; verification uses the (reachable)
  DB and the existing auth-gated editor, so the end-to-end editor check is a human/manual
  step while `tsc`/`build` and a renderer-filter check are automated.

## Acceptance criteria

- [ ] Template radio + conditional sidebar toggle appear in the editor and persist to the
      `Page` via `persistDraft`.
- [ ] Unpublish button appears for published pages (publish-capable users) and works.
- [ ] All 7 new block types have working edit forms (text, radios, toggles, rich-text, and
      add/remove/↑/↓ for repeatable items); changes round-trip through save.
- [ ] A block toggled hidden shows hidden styling in the editor and is excluded from the
      public render.
- [ ] `npx tsc --noEmit` and `npm run build` pass.
