# Phase C3c — Block Editor Slide-Over & Autosave: Design

**Date:** 2026-06-23
**Status:** Approved (design)
**Source:** Part 6.5 and Part 7 of `prompt-6-page-templates-and-content-blocks.md`
(Block Editor Panel, autosave, draft/publish indicator), the final slice of the
decomposed Phase C3.
**Depends on:** Phase C3b (`SlideOver`, `BlockCard`, `PageEditor` builder shell). Branch
`prompt-6-phase-c3c-block-editor-autosave` is stacked on the C3b branch.

## Context

C3b restructured the admin page editor into a builder shell: collapsed `BlockCard`s,
`@dnd-kit` reorder, and a `BlockPicker` slide-over. As a deliberate shippable increment,
C3b left **editing inline** — clicking Edit expands the card and renders `BlockFields` in
place — and added **no autosave**. C3c closes both gaps and finishes the Part 6 builder.

Relevant existing code:

- `src/components/admin/PageEditor.tsx` — client component rendering a `<form>`. Owns
  `items: { id: string; block: Block }[]` state, serializes `items.map(i => i.block)` to a
  hidden `blocks` input, and saves via the `savePage`/`publishPage` server actions (form
  submit). It currently **defines** `BlockFields` plus the field primitives `Field`,
  `RichField`, `Radio`, `Toggle`, `ImageField`, `IconField`, and the `moved<T>` helper as
  module-level functions. It uses `Radio`/`Toggle` itself for the template/sidebar panel.
  `BlockCard` is rendered with `expanded`/`children` and the inline-expand pattern.
- `src/components/admin/BlockCard.tsx` — collapsed card; the Edit button toggles
  `onToggleExpand`, and when `expanded` it renders `children` (the inline `BlockFields`).
- `src/components/admin/SlideOver.tsx` — reusable right-hand panel (focus trap, Esc,
  return focus). Expects a stable `onClose` (via `useCallback`).
- `src/app/admin/pages/actions.ts` — `persistDraft(formData, pageId)` writes
  title/SEO/blocks/template/hasSidebar onto the working draft via `ensureDraft`, which
  **reuses the existing DRAFT version in place** (a new version is created only when the
  latest is published). `savePage`/`publishPage` wrap it. RBAC: `content:write` for edits
  (held by ADMINISTRATOR, CLINICAL_DIRECTOR, RECEPTIONIST), `content:publish` for publish.
- `src/app/admin/pages/[id]/page.tsx` — server component that renders `PageEditor`.

## Decisions (user-approved)

1. **Extract `BlockFields` into its own module.** It is large and now needs two consumers
   (the editor panel and — for the shared `Radio`/`Toggle` primitives — `PageEditor`). The
   extraction is mechanical (move, not rewrite); behavior is unchanged.
2. **Staged editing.** The editor panel edits a **local draft copy** of the block; changes
   are committed to `PageEditor` state only on **Save Block**. **Cancel** discards the
   draft. A block added through the picker stays on the canvas with its default config even
   if its first edit is cancelled (no "unsaved/new" tracking).
3. **Keep explicit save buttons; add autosave as a safety net.** "Save draft" and
   "Save & publish" stay exactly as they are. Autosave runs every 30s (only when dirty) and
   on every Save Block; it never changes `status`/`publishedVersion`.
4. **Autosave snapshots the whole form** via a `<form>` ref (`new FormData(formRef.current)`),
   reusing `persistDraft` unchanged. This captures title, blocks, template, sidebar, and the
   uncontrolled SEO fields in one write to the working draft.

## Goal

A site admin clicks Edit on a block (or adds one) and configures it in a focused 480px
slide-over; changes apply to the page only when they click Save Block. Their work is
protected by a background autosave every 30 seconds, with a header indicator showing when
the draft was last saved. Explicit Save draft / Save & publish continue to work.

## Architecture

### Component responsibilities

| Path | Action | Responsibility |
|---|---|---|
| `src/components/admin/BlockFields.tsx` | Create (extract) | Move `BlockFields` and the primitives `Field`, `RichField`, `Radio`, `Toggle`, `ImageField`, `IconField`, `moved` out of `PageEditor.tsx`. Export `BlockFields` (consumed by the editor panel) and `Radio`, `Toggle` (consumed by `PageEditor`). Keeps importing `RichTextEditor`, `MediaPicker`, `IconPicker`, and block types. |
| `src/components/admin/BlockEditorPanel.tsx` | Create | Renders `SlideOver` (open) titled with the block type. Holds a staged draft in local state initialized from the `block` prop. Renders `<BlockFields block={draft} onChange={patch => setDraft(...)} />`. Footer: **Save Block** → `onSave(draft)`; **Cancel** → `onCancel()`. |
| `src/components/admin/SaveStatus.tsx` | Create | Header indicator. Props `{ saving: boolean; savedAt: Date | null }`. Shows "Saving…" when saving; otherwise "Saved just now" / "Saved N minute(s) ago" derived from `savedAt`, re-rendering on a 60s tick. Renders nothing before the first save. |
| `src/components/admin/BlockCard.tsx` | Modify | Replace the `expanded`/`onToggleExpand`/`children` props with a single `onEdit` action. The Edit (pencil) button calls `onEdit`; the card no longer renders fields inline (remove the `expanded && <div>{children}</div>` block and `aria-expanded`). Drag/duplicate/hide/delete + inline delete confirm are unchanged. |
| `src/components/admin/PageEditor.tsx` | Modify | Import `BlockFields`? No — import `Radio`, `Toggle` from `./BlockFields` and delete the local definitions of `BlockFields` and all primitives. Add `editingId` state; render `BlockEditorPanel` (keyed by id) when a block is being edited; wire `BlockCard onEdit`. Picking a block opens the editor for the new block. Add a `formRef`, a `dirty` flag set on every mutation, a 30s autosave interval (fires only when dirty and not already saving), an immediate autosave on Save Block, `saving`/`savedAt` state, and the `SaveStatus` indicator in the header. |
| `src/app/admin/pages/actions.ts` | Modify | Add `export async function autosavePage(formData: FormData): Promise<{ savedAt: string }>` — `requireCapability("content:write")`, read `pageId`, call `persistDraft(formData, pageId)`, `audit(...)` (a lightweight `page.autosave` entry), `revalidatePath` the editor route, and return `{ savedAt: new Date().toISOString() }`. Must not modify `status` or `publishedVersion`. |

### Editing data flow

1. **Open:** `BlockCard onEdit` → `PageEditor` sets `editingId = it.id`. `PageEditor` renders
   `{editingItem && <BlockEditorPanel key={editingItem.id} block={editingItem.block} … />}`.
   Conditional mount guarantees fresh staged state per open.
2. **Stage:** `BlockEditorPanel` keeps `draft` in local state; `BlockFields` edits mutate
   `draft` only. The card preview behind the panel is unchanged until save.
3. **Save Block:** `onSave(draft)` → `updateBlock(editingId, draft)` commits to `items`
   (hidden `blocks` input updates) → set `dirty`, trigger immediate autosave → `editingId = null`.
4. **Cancel:** `onCancel()` → `editingId = null`, draft discarded. Picker-added blocks remain
   with defaults.
5. **Add via picker:** `handlePick` inserts the new block (default config) and sets
   `editingId` to it, opening the editor immediately (replacing C3b's inline auto-expand).

### Autosave data flow

1. Any mutation (`updateBlock`, `removeBlock`, `duplicateBlock`, `toggleVisible`, reorder,
   title/template/sidebar change) sets `dirty = true`.
2. A `setInterval(…, 30000)` callback runs `autosave()` only if `dirty && !saving`.
3. `autosave()`: set `saving = true`; `const res = await autosavePage(new FormData(formRef.current))`;
   on success set `savedAt = new Date(res.savedAt)`, `dirty = false`; always clear `saving`.
   Errors are swallowed to a console warning (autosave is best-effort; explicit save remains).
4. **Save Block** calls `autosave()` directly after committing.
5. `SaveStatus` in the header reflects `saving`/`savedAt`.

### Accessibility

Reuses `SlideOver`'s focus trap / Esc / return-focus. The editor panel passes a stable
`onCancel` (via `useCallback`) as `SlideOver`'s `onClose`. Save Block / Cancel are labelled
text buttons. `SaveStatus` is wrapped in an `aria-live="polite"` region so the saved state
is announced. Removing inline-expand also removes the now-unused `aria-expanded`.

## Out of scope

- No new block types, renderer changes, or block-config schema changes.
- No version-history UI, no server-side list filtering, no preview changes.
- No RBAC changes — `content:write` already authorizes autosave (including Receptionist).
- "Save draft"/"Save & publish" behavior is unchanged (autosave is purely additive).

## Testing & verification

No unit-test runner; the editor is auth-gated. Verify with:

- `npx tsc --noEmit` — no errors.
- `npx eslint` on all created/modified files — no errors.
- `npm run build` — compiles successfully.
- **Manual human follow-up** (auth-gated): editing opens in the slide-over; field changes
  do not affect the card until Save Block; Cancel discards edits but keeps a picker-added
  block; the header shows "Saving…" then "Saved … ago"; leaving the page idle ~30s after a
  change triggers a save; explicit Save draft / Save & publish still persist and publish.

## Self-review

**Spec coverage (Part 6.5 / Part 7):**
- Block Editor Panel as a 480px slide-over with per-type form fields → `BlockEditorPanel` + extracted `BlockFields`. ✔
- Staged changes, persisted only on "Save Block" → staged `draft` + `onSave`. ✔
- "Save Block" / "Cancel" footer → `BlockEditorPanel`. ✔
- Autosave every 30s and on Save Block, draft-fields only (no status change) → `autosavePage` + interval + Save Block trigger. ✔
- "Saving…" / "Saved just now" / "Saved N minutes ago" → `SaveStatus`. ✔
- Editing moves out of the card; Edit opens the panel → `BlockCard onEdit` + `PageEditor`. ✔
- Picking a block opens its editor → `handlePick` sets `editingId`. ✔
- RBAC unchanged (`content:write` incl. Receptionist) → `autosavePage` capability check. ✔
- Out of scope (new blocks, version history) → correctly absent. ✔

**Placeholder scan:** no TBD/TODO; all components and behaviours specified. ✔

**Internal consistency:** `BlockFields` is moved (not duplicated); `PageEditor` imports
`Radio`/`Toggle` from the new module and stops defining them. `BlockEditorPanel` consumes
the extracted `BlockFields`. `autosavePage` reuses `persistDraft` and returns a serializable
`{ savedAt: string }` (string, since Server Action results cross the boundary). The
`dirty`/`saving` guards prevent overlapping or no-op writes. C3b's `expanded`/`children`
`BlockCard` props are fully replaced by `onEdit` — no dangling references. ✔
