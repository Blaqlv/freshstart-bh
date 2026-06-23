# Phase C3c — Block Editor Slide-Over & Autosave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move block editing into a 480px slide-over with staged "Save Block", and add 30-second autosave with a "Saved X ago" indicator — completing Prompt 6's builder UX.

**Architecture:** `BlockFields` (and its field primitives) are extracted from `PageEditor.tsx` into their own module so a new `BlockEditorPanel` can host them inside the C3b `SlideOver` on a staged draft copy committed only on Save Block. `PageEditor` stops editing inline (the card's Edit button opens the panel), and gains autosave: a `<form>` ref snapshots the whole form into a new `autosavePage` server action every 30s (when dirty) and on each Save Block, reusing the existing `persistDraft` so it writes the working draft in place.

**Tech Stack:** Next.js 16 (App Router, Server Actions, client components), React 19, Tailwind v4, the C3b `SlideOver`, `lucide-react`.

**Depends on:** Phase C3b (`SlideOver`, `BlockCard`, builder-shell `PageEditor`). Branch `prompt-6-phase-c3c-block-editor-autosave` is stacked on C3b.

**Testing note:** No unit-test runner exists and the editor is auth-gated. Each task verifies with `npx tsc --noEmit`, `npx eslint <files>`, and (final task) `npm run build`. Interactive checks are a human follow-up. Commit per task with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` footer.

**Conventions:** brand tokens (`brand-dark`, `brand-hover`, `line`, `ink`, `ink-soft`, `surface-alt`).

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `src/components/admin/BlockFields.tsx` | `BlockFields` + field primitives (`Field`, `RichField`, `Radio`, `Toggle`, `ImageField`, `IconField`, `moved`) | Create (extract from PageEditor) |
| `src/app/admin/pages/actions.ts` | `autosavePage` server action | Modify |
| `src/components/admin/SaveStatus.tsx` | "Saving…/Saved X ago" header indicator | Create |
| `src/components/admin/BlockEditorPanel.tsx` | Slide-over hosting `BlockFields` on a staged draft (Save Block / Cancel) | Create |
| `src/components/admin/BlockCard.tsx` | Replace inline-expand with an `onEdit` action | Modify |
| `src/components/admin/PageEditor.tsx` | Use extracted module; open editor panel instead of inline; add autosave + indicator | Modify (Tasks 1, 5, 6) |

---

## Task 1: Extract BlockFields into its own module

This is a pure relocation: move existing declarations out of `PageEditor.tsx` into a new `BlockFields.tsx`, keeping behavior identical (editing still happens inline in the card for now). Do NOT rewrite any logic.

**Files:** Create `src/components/admin/BlockFields.tsx`; Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/admin/PageEditor.tsx`. Identify these module-level declarations that currently live below the `PageEditor` component: `function BlockFields(...)`, `function Field(...)`, `function RichField(...)`, `function Radio(...)`, `function Toggle(...)`, `function ImageField(...)`, `function IconField(...)`, and `function moved<T>(...)`. Also note the two style constants near the top: `const input = "..."` and `const labelCls = "..."`.

- [ ] **Step 2: Create `BlockFields.tsx`**

Create `src/components/admin/BlockFields.tsx` with this header, then paste the eight declarations (`BlockFields`, `Field`, `RichField`, `Radio`, `Toggle`, `ImageField`, `IconField`, `moved`) **verbatim** from `PageEditor.tsx` below it. Add `export` to `BlockFields`, `Radio`, and `Toggle` (the three consumed outside this module); leave the others unexported.

```tsx
"use client";

import { type Block } from "@/lib/cms/blocks";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPicker } from "./MediaPicker";
import { IconPicker } from "./IconPicker";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-xs font-medium text-ink-soft";

// ── paste BlockFields, Field, RichField, Radio, Toggle, ImageField, IconField, moved here ──
// Add `export` to BlockFields, Radio, and Toggle. Keep the bodies byte-for-byte identical.
```

So the three exported signatures read exactly:
```tsx
export function BlockFields({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) { /* … unchanged … */ }
export function Radio({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) { /* … unchanged … */ }
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) { /* … unchanged … */ }
```

- [ ] **Step 3: Remove the moved declarations from `PageEditor.tsx`**

Delete the eight functions (`BlockFields`, `Field`, `RichField`, `Radio`, `Toggle`, `ImageField`, `IconField`, `moved`) from `PageEditor.tsx`. **Keep** the top-of-file `const input` and `const labelCls` (PageEditor's own title/SEO inputs still use them). Remove the now-unused imports `RichTextEditor`, `MediaPicker`, `IconPicker` from `PageEditor.tsx` (they moved to `BlockFields.tsx`).

- [ ] **Step 4: Import the extracted pieces into `PageEditor.tsx`**

Add this import near the other `./` imports in `PageEditor.tsx`:

```tsx
import { BlockFields, Radio, Toggle } from "./BlockFields";
```

`PageEditor` still renders `<BlockFields block={it.block} onChange={(patch) => updateBlock(it.id, patch)} />` inside `BlockCard` and still uses `<Radio …>`/`<Toggle …>` for the template/sidebar panel — all unchanged. This task does not alter behavior.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/admin/BlockFields.tsx src/components/admin/PageEditor.tsx`
Expected: no errors. If tsc reports unused or missing imports, reconcile per Steps 3–4 (PageEditor should no longer import `RichTextEditor`/`MediaPicker`/`IconPicker`; `BlockFields.tsx` must import them).

- [ ] **Step 6: Build (sanity — this is a refactor)**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/BlockFields.tsx src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Extract BlockFields into its own module

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: autosavePage server action

**Files:** Modify `src/app/admin/pages/actions.ts`

The file already has `persistDraft(formData, pageId)` (writes title/SEO/blocks/template/hasSidebar to the working draft), `requireCapability`, and `audit`. Read it first.

- [ ] **Step 1: Add the action**

After the existing `savePage` function, add:

```ts
export async function autosavePage(formData: FormData): Promise<{ savedAt: string }> {
  const session = await requireCapability("content:write");
  const pageId = String(formData.get("pageId"));
  const { draft, blockCount } = await persistDraft(formData, pageId);
  await audit({ sub: session.sub, email: session.email }, "page.autosave", "Page", pageId, {
    version: draft.version,
    blocks: blockCount,
  });
  revalidatePath(`/admin/pages/${pageId}`);
  return { savedAt: new Date().toISOString() };
}
```

(It intentionally never touches `status` or `publishedVersion` — `persistDraft` only writes draft fields. The return is a serializable string so it crosses the Server Action boundary.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/admin/pages/actions.ts`
Expected: no errors. (`persistDraft` already returns `{ draft, blockCount }`, so this matches.)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/pages/actions.ts
git commit -m "$(cat <<'EOF'
Add autosavePage server action

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SaveStatus indicator

**Files:** Create `src/components/admin/SaveStatus.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}

export function SaveStatus({ saving, savedAt }: { saving: boolean; savedAt: Date | null }) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => force((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [savedAt]);

  let text = "";
  if (saving) text = "Saving…";
  else if (savedAt) text = `Saved ${relativeTime(savedAt)}`;

  return (
    <span aria-live="polite" className="self-center text-xs text-ink-soft">
      {text}
    </span>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/admin/SaveStatus.tsx`
Expected: no errors. (`const [, force]` deliberately ignores the state value; the setter forces a re-render so the relative time refreshes each minute.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/SaveStatus.tsx
git commit -m "$(cat <<'EOF'
Add SaveStatus autosave indicator

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: BlockEditorPanel

**Files:** Create `src/components/admin/BlockEditorPanel.tsx`

Depends on the C3b `SlideOver` and the Task 1 `BlockFields`. `blockLabel` is exported from `@/lib/cms/blocks`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { SlideOver } from "./SlideOver";
import { BlockFields } from "./BlockFields";
import { type Block, blockLabel } from "@/lib/cms/blocks";

export function BlockEditorPanel({
  block,
  onSave,
  onCancel,
}: {
  block: Block;
  onSave: (block: Block) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Block>(block);

  return (
    <SlideOver open onClose={onCancel} title={`Edit ${blockLabel(draft.type)}`}>
      <div className="space-y-3">
        <BlockFields
          block={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }) as Block)}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-alt"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Save Block
        </button>
      </div>
    </SlideOver>
  );
}
```

(The component is mounted only while a block is being edited and is keyed by block id by its parent, so `useState(block)` gives a fresh staged draft each open. `onCancel` is the panel's `SlideOver` `onClose`; the parent passes a stable callback.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/admin/BlockEditorPanel.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BlockEditorPanel.tsx
git commit -m "$(cat <<'EOF'
Add BlockEditorPanel slide-over with staged draft

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Move editing into the slide-over

Change the card's Edit action to open the panel, and wire `BlockEditorPanel` into `PageEditor`. After this task editing happens in the slide-over, not inline.

**Files:** Modify `src/components/admin/BlockCard.tsx`, `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Rework `BlockCard` props**

In `src/components/admin/BlockCard.tsx`, replace the `expanded`, `onToggleExpand`, and `children` props with a single `onEdit`. The new prop type and the Edit button change; everything else (drag handle, duplicate, hide, delete + confirm) stays. Replace the component's prop destructuring + type with:

```tsx
export function BlockCard({
  id,
  block,
  onEdit,
  onDuplicate,
  onToggleVisible,
  onDelete,
}: {
  id: string;
  block: Block;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}) {
```

Change the Edit button to:

```tsx
          <button type="button" onClick={onEdit} aria-label="Edit block" className={iconBtn}>
            <Pencil className="h-4 w-4" />
          </button>
```

Delete the trailing inline-expand block entirely (the `{expanded && <div className="space-y-3 border-t border-line p-4">{children}</div>}` line). `BlockCard` no longer renders fields.

- [ ] **Step 2: Verify the card type-checks in isolation will fail until PageEditor updates**

Run: `npx tsc --noEmit`
Expected: errors in `PageEditor.tsx` only (it still passes `expanded`/`children`). That is expected — proceed to Step 3 to fix the call site. (Do not commit yet.)

- [ ] **Step 3: Update `PageEditor` imports and editing state**

In `src/components/admin/PageEditor.tsx`:

Change the BlockFields import (PageEditor no longer renders `BlockFields` directly — the panel does) to drop `BlockFields`:

```tsx
import { Radio, Toggle } from "./BlockFields";
```

Add the panel import next to the other `./` imports:

```tsx
import { BlockEditorPanel } from "./BlockEditorPanel";
```

Rename the `expandedId` state to `editingId` (it now tracks which block's editor is open). Replace the existing line:

```tsx
  const [expandedId, setExpandedId] = useState<string | null>(null);
```
with:
```tsx
  const [editingId, setEditingId] = useState<string | null>(null);
```

Add a stable cancel handler and a save handler among the other handlers (place after `handlePick`):

```tsx
  const cancelEdit = useCallback(() => setEditingId(null), []);
  function saveBlock(updated: Block) {
    if (editingId) {
      setItems((arr) =>
        arr.map((it) => (it.id === editingId ? { ...it, block: updated } : it)),
      );
    }
    setEditingId(null);
  }
```

- [ ] **Step 4: Update `handlePick` to open the editor**

In `handlePick`, replace `setExpandedId(item.id);` with `setEditingId(item.id);`.

- [ ] **Step 5: Update the card render and remove the inline `BlockFields`**

Replace the `<BlockCard …>…</BlockCard>` element (currently using `expanded`/`onToggleExpand` and wrapping a `<BlockFields …>` child) with this self-closing form:

```tsx
                    <BlockCard
                      id={it.id}
                      block={it.block}
                      onEdit={() => setEditingId(it.id)}
                      onDuplicate={() => duplicateBlock(it.id)}
                      onToggleVisible={() => toggleVisible(it.id)}
                      onDelete={() => removeBlock(it.id)}
                    />
```

(The `<BlockFields block={it.block} onChange={…} />` child is removed — editing now lives in the panel.)

- [ ] **Step 6: Render the editor panel**

Immediately after the existing `<BlockPicker … />` element, add:

```tsx
      {editingId &&
        (() => {
          const editingItem = items.find((it) => it.id === editingId);
          return editingItem ? (
            <BlockEditorPanel
              key={editingItem.id}
              block={editingItem.block}
              onSave={saveBlock}
              onCancel={cancelEdit}
            />
          ) : null;
        })()}
```

- [ ] **Step 7: Fix `removeBlock`'s stale reference**

`removeBlock` currently clears `expandedId`. Update it to clear `editingId`:

```tsx
  function removeBlock(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  }
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/admin/BlockCard.tsx src/components/admin/PageEditor.tsx`
Expected: no errors. Confirm there are no remaining references to `expandedId`, `setExpandedId`, `onToggleExpand`, or a `<BlockFields` tag inside `PageEditor.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/BlockCard.tsx src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Open block editing in a slide-over panel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add autosave to PageEditor

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Add imports**

Add `useEffect` and `useRef` to the React import, the action, and the indicator. The React import becomes:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
```

Add near the other imports:

```tsx
import { savePage, publishPage, autosavePage } from "@/app/admin/pages/actions";
import { SaveStatus } from "./SaveStatus";
```

(Note: `savePage`/`publishPage` are already imported from that path — extend the existing import to include `autosavePage` rather than duplicating the line.)

- [ ] **Step 2: Add refs and autosave state**

Inside `PageEditor`, after the existing `useState` declarations, add:

```tsx
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const firstRender = useRef(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
```

- [ ] **Step 3: Mark dirty on any edit**

Add this effect (after the handlers, before `return`). It flags unsaved changes whenever the tracked editor state changes, skipping the initial render:

```tsx
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
  }, [items, title, template, hasSidebar]);
```

- [ ] **Step 4: Add the autosave function and interval**

Add after the effect from Step 3:

```tsx
  const autosave = useCallback(async () => {
    if (savingRef.current || !dirtyRef.current || !formRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await autosavePage(new FormData(formRef.current));
      dirtyRef.current = false;
      setSavedAt(new Date(res.savedAt));
    } catch (err) {
      console.warn("Autosave failed", err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void autosave();
    }, 30000);
    return () => clearInterval(timer);
  }, [autosave]);
```

- [ ] **Step 5: Attach the form ref**

Change the form opening tag from `<form className="space-y-6">` to:

```tsx
    <form ref={formRef} className="space-y-6">
```

- [ ] **Step 6: Trigger autosave on Save Block**

Update `saveBlock` (from Task 5) to flag dirty and autosave after the commit is flushed to the DOM (so the hidden `blocks` input reflects the change before the form snapshot):

```tsx
  function saveBlock(updated: Block) {
    if (editingId) {
      setItems((arr) =>
        arr.map((it) => (it.id === editingId ? { ...it, block: updated } : it)),
      );
    }
    setEditingId(null);
    dirtyRef.current = true;
    setTimeout(() => {
      void autosave();
    }, 0);
  }
```

- [ ] **Step 7: Show the indicator in the header**

In the header action row, add the indicator before the "Preview draft" link. Change the opening of that `<div className="flex flex-wrap gap-2">` block so the first child is the status:

```tsx
        <div className="flex flex-wrap items-center gap-2">
          <SaveStatus saving={saving} savedAt={savedAt} />
          <a
            href={`/admin/pages/${page.id}/preview`}
```

(Only the wrapper className gains `items-center` and the `<SaveStatus … />` line is inserted; the existing buttons stay.)

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/admin/PageEditor.tsx`
Expected: no errors. The `autosave` callback has an empty dep array (it only touches refs and setters, all stable), so `react-hooks/exhaustive-deps` should not flag it; if it does, do NOT disable the rule — report it.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Add 30s autosave and save indicator to the page editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Full verification

**Files:** none modified.

- [ ] **Step 1: Lint all created/modified files**

Run:
```bash
npx eslint src/components/admin/BlockFields.tsx src/components/admin/SaveStatus.tsx src/components/admin/BlockEditorPanel.tsx src/components/admin/BlockCard.tsx src/components/admin/PageEditor.tsx src/app/admin/pages/actions.ts
```
Expected: no errors (warnings acceptable).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: "Compiled successfully"; `/admin/pages/[id]` still appears in the route list.

- [ ] **Step 4: Human verification note (not a code step)**

The editor is auth-gated, so verify manually: log in to `/admin`, open a page, and confirm:
- Clicking **Edit** on a card opens the 480px slide-over with that block's fields; the card behind it does not change while you type.
- **Save Block** applies the changes to the card and closes the panel; **Cancel** discards edits.
- Adding a block from the picker opens its editor immediately; cancelling keeps the block on the canvas with its defaults.
- The header shows "Saving…" then "Saved just now", updating to "Saved N minutes ago"; making a change and waiting ~30s triggers a save; Save Block triggers an immediate save.
- Explicit **Save draft** and **Save & publish** still persist and publish correctly.
- The slide-over traps focus and returns focus on close (Esc and backdrop close it).

(No commit; report as a manual follow-up.)

---

## Self-review

**Spec coverage (design doc → tasks):**
- Extract `BlockFields` into its own module (consumers: panel + PageEditor's `Radio`/`Toggle`) → Task 1. ✔
- `autosavePage` server action (content:write, draft-only, returns `{ savedAt: string }`) → Task 2. ✔
- "Saving…/Saved just now/Saved N minutes ago" indicator, 60s refresh, aria-live → Task 3. ✔
- `BlockEditorPanel`: SlideOver + staged draft + Save Block / Cancel → Task 4. ✔
- Editing moves out of the card (Edit opens the panel; inline-expand removed) → Task 5 (BlockCard `onEdit`, PageEditor `editingId`/`BlockEditorPanel`). ✔
- Picking a block opens its editor → Task 5 Step 4 (`handlePick` → `setEditingId`). ✔
- Cancel keeps a picker-added block with defaults → Task 5 (`saveBlock` only mutates on save; cancel just clears `editingId`). ✔
- Autosave every 30s when dirty + on Save Block, whole-form snapshot via ref → Task 6 (`dirtyRef`, interval, `setTimeout(0)` post-commit snapshot). ✔
- Explicit Save draft/Save & publish unchanged → untouched in all tasks. ✔
- a11y: SlideOver focus trap reused; stable `onCancel` via `useCallback`; aria-live indicator → Tasks 3–5. ✔
- Out of scope (new blocks, version history, RBAC changes) → correctly absent. ✔

**Placeholder scan:** Task 1 is an explicit verbatim relocation of named existing declarations (not a vague "move stuff"); all other steps contain complete code and exact commands. No TBD/TODO. ✔

**Type consistency:** `BlockEditorPanel` props (`block: Block`, `onSave: (block: Block) => void`, `onCancel: () => void`) match the call site in Task 5 Step 6 (`block={editingItem.block}`, `onSave={saveBlock}`, `onCancel={cancelEdit}`). `saveBlock(updated: Block)` and `cancelEdit` are defined in Task 5 and `saveBlock` is extended (not redefined) in Task 6. `BlockCard`'s new `onEdit: () => void` matches `onEdit={() => setEditingId(it.id)}`. `autosavePage(formData: FormData): Promise<{ savedAt: string }>` (Task 2) matches its use in Task 6 (`new Date(res.savedAt)`). `SaveStatus` props (`saving`, `savedAt`) match Task 6 Step 7. `Radio`/`Toggle` exported in Task 1 match PageEditor's existing usage. ✔
