# Phase C3b — Block-Builder Shell: Design

**Date:** 2026-06-23
**Status:** Approved (design)
**Source:** Part 6.2, 6.3, and Part 9 of `prompt-6-page-templates-and-content-blocks.md`
(block canvas, Block Picker, SVG thumbnails), second slice of the decomposed Phase C3.
**Depends on:** Phase A (block types, `template`/`hasSidebar`), Phase B (`RichTextEditor`),
Phase C1 (`BlockFields` edit forms for every block type), Phase C2 (`MediaPicker`,
`IconPicker`), Phase C3a (page-list filters). This branch is stacked on the C3a branch.

## Context

`src/components/admin/PageEditor.tsx` is a single inline form. Every block is rendered as
an always-expanded card; reordering uses ↑/↓ buttons; adding a block is a flat row of pill
buttons covering all types ungrouped; saving is a form submit through the `savePage` /
`publishPage` server actions. There is no drag-and-drop, no collapsed preview, no grouped
picker, and no SVG thumbnails.

C3b delivers the prompt's **builder shell**: collapsed block cards, drag-to-reorder via
`@dnd-kit`, and a Block Picker slide-over with category groups and SVG thumbnails. The
remaining Phase C3 work — the **Block Editor slide-over** and **autosave** — is **C3c** and
is out of scope here.

Relevant existing code:

- `src/components/admin/PageEditor.tsx` — stateful client component. Holds `blocks` in
  `useState`, serializes them to a hidden `blocks` JSON input, and saves via
  `savePage`/`publishPage`. Contains the `BlockFields` switch (edit forms for all 15 block
  types) and helper sub-components (`Field`, `RichField`, `Radio`, `Toggle`, `ImageField`,
  `IconField`).
- `src/lib/cms/blocks.ts` — `BlockType` union (15 types), per-type interfaces, the
  `blockRegistry` (`type`, `label`, `description`, `create()`), `blockLabel()`, and
  `parseBlocks()`. There is **no `imageGallery` type** in this repo (the prompt listed it
  as "existing"; it was never built here — out of scope).
- `src/app/admin/pages/actions.ts` — `savePage`/`publishPage` persist through
  `persistDraft` → `ensureDraft`, which **reuses the working DRAFT version in place** and
  only creates a new version when the latest is published. (Relevant to C3c autosave; C3b
  changes nothing here.)
- `src/components/admin/MediaPicker.tsx`, `IconPicker.tsx` — already modal pickers (from
  C2); `BlockFields` already wires them in. C3b does not touch them.
- Brand tokens in use: `brand-dark`, `brand`, `brand-hover`, `ink`, `ink-soft`, `line`,
  `surface-alt`, `accent`, `rounded-card`. `lucide-react` is already a dependency.

## Decisions (user-approved)

1. **Full, faithful restructure** of the block canvas into the slide-over builder UX
   (collapsed cards + dnd-kit + Block Picker slide-over), rather than a lighter hybrid.
2. **Split into C3b + C3c.** C3b = builder shell (this spec). C3c = Block Editor slide-over
   (staged "Save Block") + autosave + "Saved X ago".
3. **Editing stays inline in C3b.** The prompt says picking a block "immediately opens the
   Block Editor Panel," but that panel is C3c. To avoid building a throwaway and to keep
   every phase shippable, C3b keeps editing inline: clicking **Edit** (or adding a block)
   expands the card in place and renders the *existing, unchanged* `BlockFields`. C3c lifts
   those fields into the slide-over. Editing never breaks between phases.
4. **Add `@dnd-kit`** (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) — the
   prompt mandates it for reorder and it provides keyboard accessibility out of the box.
5. **No persistence changes.** `PageEditor` remains the single source of truth for `blocks`;
   save still goes through `savePage`/`publishPage` form submit. Autosave is C3c.

## Goal

A site admin editing a page sees a clean vertical list of collapsed block cards they can
drag to reorder (mouse or keyboard), each with a content preview and Edit / Duplicate /
Hide / Delete actions. They add blocks through a searchable, categorised slide-over with
SVG thumbnails, inserting at any position. Editing a block still expands it inline.

## Architecture

### Component responsibilities

| Path | Action | Responsibility |
|---|---|---|
| `src/components/admin/SlideOver.tsx` | Create | Reusable right-hand slide-over: backdrop overlay, Escape-to-close, **focus trap while open + return focus to the trigger on close**. Props: `open`, `onClose`, `title`, `widthClass?`, `children`. Reused by the C3c Block Editor. |
| `src/components/admin/block-thumbnails/index.tsx` | Create | `viewBox="0 0 80 56"` SVG thumbnail components — dedicated shapes for the 7 new block types (per Part 9), lightweight shapes for the other 8 types, and a `thumbnailFor(type: BlockType)` lookup with a generic fallback. Uses `#D1D5DB` (grey-300) for fills and `#6B7280` (grey-500) for lines. |
| `src/components/admin/BlockPicker.tsx` | Create | Renders inside `SlideOver`. Search input (filters by label/description), 4 ordered category sections, and a thumbnail card per type (thumbnail + label + 1-line description). Filters out blocks unavailable for the current template. Calls `onPick(type)` then closes. |
| `src/components/admin/BlockCard.tsx` | Create | One collapsed block card via `useSortable`. Shows drag handle (`GripVertical`), block label, **80-char content preview**, and action buttons **Edit (`Pencil`) / Duplicate (`Copy`) / Hide (`Eye`/`EyeOff`) / Delete (`Trash2`)**. Delete uses an **inline confirm** ("Delete this block?" Confirm/Cancel). When expanded, renders `children` (the inline `BlockFields`, passed from `PageEditor`). Hidden blocks render dimmed with a "Hidden" tag. |
| `src/lib/cms/blocks.ts` | Modify | Add `category: BlockCategory` to `BlockMeta` and to every registry entry. Export `BlockCategory` type, an ordered `blockCategories` list with display labels, and a `blockPreview(block: Block): string` helper that returns an HTML-stripped, ≤80-char summary (heading/title/first item/body, per type). |
| `src/components/admin/PageEditor.tsx` | Modify | Replace the block list with a dnd-kit `DndContext` + `SortableContext` of `BlockCard`s; remove ↑/↓ reorder and the flat add-block pill row; track which card is expanded and which insert index is active; wire the bottom "+ Add block" button and the hover "+" insert-between buttons to open `BlockPicker` at the chosen index. `BlockFields` and the form/save path are unchanged. |
| `package.json` | Modify | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to dependencies. |

### Block Picker categories (15 types, repo names)

- **Text & Content:** `richText`, `richTextColumns`, `numberedList`, `iconList`
- **Images:** `imageLeftTextRight`, `imageRightTextLeft`, `imageTitleBelow`, `imageTitleBeside`
- **Layout & Navigation:** `hero`, `ctaBanner`, `faqAccordion`
- **Dynamic Content:** `testimonialCarousel`, `serviceGrid`, `teamGrid`, `locationGrid`

**Template availability (Part 3.1):** when `page.template === "SERVICE_DETAIL"`, the picker
hides `hero` (service pages use their own hero component). `GENERAL` shows all 15.

### Data flow

1. `PageEditor` owns `blocks: Block[]` in state (unchanged) and an `expandedIndex`,
   `pickerOpen`, and `insertIndex`.
2. **Reorder:** `DndContext`'s `onDragEnd` maps the dragged id to its index and reorders the
   `blocks` array. Each `BlockCard` gets a stable id (index-based id is sufficient since the
   list is small and fully controlled; use `arrayMove` from `@dnd-kit/sortable`).
3. **Add:** the bottom "+ Add block" sets `insertIndex = blocks.length`; a hover "+" between
   cards `i` and `i+1` sets `insertIndex = i+1`; both open the picker. `onPick(type)` runs
   `blockRegistry.find(...).create()`, splices it in at `insertIndex`, closes the picker, and
   sets `expandedIndex` to the new block so it expands for editing.
4. **Edit:** clicking Edit toggles `expandedIndex`; the expanded card renders `BlockFields`
   for that block (passed as `children`), which writes back via the existing `update(i, patch)`.
5. **Duplicate:** deep-clone the block and splice the copy directly below.
6. **Hide:** toggle `isVisible` via the existing update path.
7. **Delete:** inline confirm, then remove from the array.
8. Every mutation re-serializes `blocks` into the hidden `blocks` input; the user still
   clicks **Save draft** / **Save & publish** (form submit). No new server actions.

### Accessibility

- `SlideOver` traps focus while open and restores focus to the trigger on close; Escape
  closes it; the backdrop is click-to-close.
- dnd-kit `KeyboardSensor` with `sortableKeyboardCoordinates` enables keyboard reordering;
  the drag handle has `aria-label="Drag to reorder"`.
- All icon-only buttons carry `aria-label`s. Emoji controls (👁/🙈/✕/↑/↓) are replaced with
  labelled Lucide icons (`Eye`, `EyeOff`, `Copy`, `Pencil`, `Trash2`, `GripVertical`).
- Search input and category regions are labelled.

## Out of scope (deferred to C3c)

- **Block Editor slide-over** — editing remains inline-expand in C3b.
- **Autosave** (every 30s + on Save Block) and the **"Saved just now / X minutes ago"**
  indicator.
- Server-action changes. RBAC is already enforced (`content:write` / `content:publish`);
  C3b adds no mutations.

## Testing & verification

No unit-test runner exists and the editor is auth-gated, so verification is:

- `npx tsc --noEmit` — no errors.
- `npx eslint` on all created/modified files — no errors.
- `npm run build` — compiles successfully.
- **Manual human follow-up** (auth-gated): log in to `/admin`, open a page editor, and
  confirm cards collapse with previews, drag-reorder works by mouse and keyboard, the Block
  Picker slide-over opens with grouped thumbnails and search, template filtering hides
  `hero` on Service Detail pages, and Duplicate / Hide / Delete (with confirm) all work.

## Self-review

**Spec coverage (Part 6.2 / 6.3 / 9):**
- Collapsed block cards with 80-char preview → `BlockCard` + `blockPreview`. ✔
- Drag handle + dnd-kit reorder (mouse + keyboard) → `PageEditor` `DndContext` + `BlockCard` `useSortable`. ✔
- Edit / Duplicate / Toggle visibility / Delete (inline confirm) → `BlockCard` actions. ✔
- "+ Add block" at bottom and hover "+" between blocks → `PageEditor` insert-index wiring. ✔
- Block Picker slide-over: search + 4 category groups + thumbnails + descriptions → `BlockPicker` + `SlideOver`. ✔
- SVG thumbnails (7 new in detail + the rest) → `block-thumbnails/`. ✔
- Template availability (hide `hero` on SERVICE_DETAIL) → `BlockPicker` filter. ✔
- a11y: focus trap, keyboard reorder, aria-labels → covered above. ✔
- Out of scope (editor slide-over, autosave) → correctly deferred to C3c. ✔

**Placeholder scan:** no TBD/TODO; all components and behaviours specified. ✔

**Consistency:** `imageGallery` explicitly excluded (not in repo); 15 types categorised
4+4+3+4 = 15. Editing path reuses unchanged `BlockFields`; save path unchanged. C3c
boundary (editor slide-over + autosave) stated identically in Decisions, Out of scope, and
coverage. ✔
