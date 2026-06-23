# Phase C3b — Block-Builder Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline block list in the admin page editor with the prompt's builder shell — collapsed block cards, `@dnd-kit` drag-to-reorder, and a searchable, categorised Block Picker slide-over with SVG thumbnails.

**Architecture:** `PageEditor` stays the stateful owner of the block array but now stores each block alongside a stable id (`{ id, block }[]`) so dnd-kit has durable keys; it serializes `items.map(i => i.block)` into the existing hidden `blocks` input, so the `savePage`/`publishPage` form-submit path is unchanged. The block list renders through a dnd-kit `SortableContext` of new `BlockCard`s (collapsed preview + Edit/Duplicate/Hide/Delete; "Edit" expands the existing `BlockFields` inline). Adding a block goes through a new reusable `SlideOver` hosting a `BlockPicker`. The Block Editor slide-over and autosave are explicitly deferred to C3c.

**Tech Stack:** Next.js 16 (App Router, client components), React 19, Tailwind v4, `lucide-react` (already a dep), and the new `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.

**Depends on:** Phase A (block types), Phase B (`RichTextEditor`), C1 (`BlockFields`), C2 (`MediaPicker`/`IconPicker`), C3a (filters). Branch `prompt-6-phase-c3b-block-builder` is stacked on C3a.

**Testing note:** No unit-test runner exists and the editor is auth-gated. Each task verifies with `npx tsc --noEmit`, `npx eslint <files>`, and (final task) `npm run build`. The interactive drag/slide-over/a11y check is a human follow-up. Commit per task with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` footer.

**Conventions:** brand tokens (`brand-dark`, `brand`, `brand-hover`, `ink`, `ink-soft`, `line`, `surface-alt`, `accent`, `rounded-card`). All icon-only buttons get `aria-label`s.

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `package.json` | Add `@dnd-kit/*` deps | Modify |
| `src/lib/cms/blocks.ts` | `BlockCategory`, `blockCategories`, `category` on each registry entry, `blockPreview()` | Modify |
| `src/components/admin/SlideOver.tsx` | Reusable right-hand slide-over (overlay, Esc, focus trap, return focus) | Create |
| `src/components/admin/block-thumbnails/index.tsx` | `viewBox="0 0 80 56"` SVG thumbnails + `BlockThumbnail` lookup | Create |
| `src/components/admin/BlockPicker.tsx` | Picker content inside `SlideOver`: search, category groups, thumbnail cards, template filter | Create |
| `src/components/admin/BlockCard.tsx` | Collapsed sortable card: drag handle, preview, Edit/Duplicate/Hide/Delete (inline confirm), inline-expand children | Create |
| `src/components/admin/PageEditor.tsx` | Switch to `{id,block}[]` state; render via dnd-kit; wire picker + insert index; remove ↑/↓ and flat add-row | Modify |

---

## Task 1: Add @dnd-kit dependencies

**Files:** Modify `package.json` (+ lockfile)

- [ ] **Step 1: Install the packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
Expected: three packages added to `dependencies`; `package-lock.json` updated; no peer-dependency errors (these versions support React 19).

- [ ] **Step 2: Verify they resolve**

Run:
```bash
node -e "require.resolve('@dnd-kit/core'); require.resolve('@dnd-kit/sortable'); require.resolve('@dnd-kit/utilities'); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add @dnd-kit packages for block reordering

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Block category metadata + preview helper

**Files:** Modify `src/lib/cms/blocks.ts`

- [ ] **Step 1: Add the category type and ordered list**

Immediately after the `BlockType` union (after line 22, before `export type HeroBlock`), insert:

```ts
export type BlockCategory = "text" | "images" | "layout" | "dynamic";

export const blockCategories: { id: BlockCategory; label: string }[] = [
  { id: "text", label: "Text & Content" },
  { id: "images", label: "Images" },
  { id: "layout", label: "Layout & Navigation" },
  { id: "dynamic", label: "Dynamic Content" },
];
```

- [ ] **Step 2: Add `category` to the `BlockMeta` type**

Change the `BlockMeta` type (currently lines 150-155) to:

```ts
type BlockMeta = {
  type: BlockType;
  label: string;
  description: string;
  category: BlockCategory;
  create: () => Block;
};
```

- [ ] **Step 3: Add `category` to every registry entry**

Add a `category` field to each of the 15 entries in `blockRegistry` using this mapping (place the field next to `description` in each entry):

- `hero` → `"layout"`
- `richText` → `"text"`
- `faqAccordion` → `"layout"`
- `serviceGrid` → `"dynamic"`
- `testimonialCarousel` → `"dynamic"`
- `locationGrid` → `"dynamic"`
- `teamGrid` → `"dynamic"`
- `ctaBanner` → `"layout"`
- `numberedList` → `"text"`
- `iconList` → `"text"`
- `richTextColumns` → `"text"`
- `imageLeftTextRight` → `"images"`
- `imageRightTextLeft` → `"images"`
- `imageTitleBelow` → `"images"`
- `imageTitleBeside` → `"images"`

For example the `hero` entry becomes:

```ts
  {
    type: "hero",
    label: "Hero",
    description: "Large heading with optional eyebrow, body, and a call to action.",
    category: "layout",
    create: () => ({ type: "hero", heading: "New hero heading", body: "" }),
  },
```

- [ ] **Step 4: Add the `blockPreview` helper**

At the end of the file (after `parseBlocks`), append:

```ts
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A short, HTML-stripped summary of a block for the collapsed card (≤80 chars). */
export function blockPreview(block: Block): string {
  let raw = "";
  switch (block.type) {
    case "hero":
    case "richText":
    case "ctaBanner":
      raw = block.heading || block.body || "";
      break;
    case "faqAccordion":
      raw = block.heading || block.items[0]?.q || "";
      break;
    case "serviceGrid":
    case "testimonialCarousel":
    case "locationGrid":
    case "teamGrid":
      raw = block.heading || "";
      break;
    case "numberedList":
      raw = block.title || block.intro || block.items[0]?.heading || "";
      break;
    case "iconList":
      raw = block.title || block.intro || block.items[0]?.label || "";
      break;
    case "richTextColumns":
      raw = block.heading || block.intro || block.columns[0]?.body || "";
      break;
    case "imageLeftTextRight":
    case "imageRightTextLeft":
    case "imageTitleBeside":
      raw = block.title || block.body || "";
      break;
    case "imageTitleBelow":
      raw = block.title || block.caption || "";
      break;
  }
  const text = stripHtml(raw);
  return text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text;
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/cms/blocks.ts`
Expected: no errors. (The `switch` narrows on the discriminated union, so each branch sees the correct block shape.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/cms/blocks.ts
git commit -m "$(cat <<'EOF'
Add block category metadata and preview helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Reusable SlideOver component

**Files:** Create `src/components/admin/SlideOver.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SlideOver({
  open,
  onClose,
  title,
  widthClass = "w-[480px]",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  widthClass?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex h-full max-w-full flex-col bg-white shadow-xl outline-none ${widthClass}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1 text-ink-soft hover:bg-surface-alt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
```

**Note for callers:** pass a *stable* `onClose` (wrap in `useCallback`) so the focus-trap effect does not re-run and steal focus while the panel is open.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/SlideOver.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/SlideOver.tsx
git commit -m "$(cat <<'EOF'
Add reusable SlideOver panel with focus trap

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Block thumbnails

**Files:** Create `src/components/admin/block-thumbnails/index.tsx`

- [ ] **Step 1: Write the thumbnails module**

```tsx
import type { BlockType } from "@/lib/cms/blocks";

const FILL = "#D1D5DB"; // grey-300 — placeholder shapes
const LINE = "#6B7280"; // grey-500 — text lines

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 80 56" className="h-14 w-20" role="img" aria-hidden="true">
      {children}
    </svg>
  );
}

const line = (x: number, y: number, w: number, h = 3) => (
  <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={h / 2} fill={LINE} />
);

// ── New blocks (Part 9) ────────────────────────────────────────────────────
const NumberedListThumb = () => (
  <Frame>
    {[14, 30, 46].map((cy) => (
      <g key={cy}>
        <circle cx="12" cy={cy} r="5" fill={FILL} />
        {line(22, cy - 3, 44)}
        {line(22, cy + 3, 30)}
      </g>
    ))}
  </Frame>
);

const IconListThumb = () => (
  <Frame>
    {[10, 26, 42].map((y) => (
      <g key={`l${y}`}>
        <rect x="6" y={y} width="7" height="7" rx="1.5" fill={FILL} />
        {line(17, y + 2, 20)}
      </g>
    ))}
    {[10, 26, 42].map((y) => (
      <g key={`r${y}`}>
        <rect x="43" y={y} width="7" height="7" rx="1.5" fill={FILL} />
        {line(54, y + 2, 20)}
      </g>
    ))}
  </Frame>
);

const RichTextColumnsThumb = () => (
  <Frame>
    {[6, 30, 54].map((x) => (
      <g key={x}>
        {line(x, 10, 20)}
        {line(x, 17, 20)}
        {line(x, 24, 16)}
        {line(x, 31, 20)}
        {line(x, 38, 14)}
      </g>
    ))}
  </Frame>
);

const ImageLeftTextRightThumb = () => (
  <Frame>
    <rect x="6" y="10" width="32" height="36" rx="2" fill={FILL} />
    {[12, 20, 28, 36].map((y) => line(44, y, 30))}
  </Frame>
);

const ImageRightTextLeftThumb = () => (
  <Frame>
    <rect x="42" y="10" width="32" height="36" rx="2" fill={FILL} />
    {[12, 20, 28, 36].map((y) => line(6, y, 30))}
  </Frame>
);

const ImageTitleBelowThumb = () => (
  <Frame>
    <rect x="10" y="8" width="60" height="28" rx="2" fill={FILL} />
    {line(22, 42, 36, 4)}
    {line(28, 50, 24)}
  </Frame>
);

const ImageTitleBesideThumb = () => (
  <Frame>
    <rect x="6" y="14" width="28" height="28" rx="2" fill={FILL} />
    {[18, 26, 34].map((y) => line(40, y, 34, 4))}
  </Frame>
);

// ── Existing blocks (lightweight) ──────────────────────────────────────────
const HeroThumb = () => (
  <Frame>
    <rect x="6" y="8" width="68" height="40" rx="2" fill={FILL} />
    {line(24, 24, 32, 4)}
    <rect x="32" y="34" width="16" height="6" rx="3" fill={LINE} />
  </Frame>
);

const RichTextThumb = () => (
  <Frame>
    {line(8, 12, 30, 4)}
    {[22, 29, 36, 43].map((y) => line(8, y, 64))}
  </Frame>
);

const CtaThumb = () => (
  <Frame>
    <rect x="6" y="16" width="68" height="24" rx="3" fill={FILL} />
    {line(20, 24, 28)}
    <rect x="46" y="29" width="14" height="6" rx="3" fill={LINE} />
  </Frame>
);

const FaqThumb = () => (
  <Frame>
    {[12, 26, 40].map((y) => (
      <g key={y}>
        {line(8, y, 50)}
        <rect x="66" y={y - 1} width="6" height="6" rx="1.5" fill={FILL} />
      </g>
    ))}
  </Frame>
);

const GridThumb = () => (
  <Frame>
    {[
      [8, 10],
      [44, 10],
      [8, 32],
      [44, 32],
    ].map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="28" height="16" rx="2" fill={FILL} />
    ))}
  </Frame>
);

const TeamThumb = () => (
  <Frame>
    {[16, 40, 64].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="22" r="8" fill={FILL} />
        {line(cx - 9, 36, 18)}
      </g>
    ))}
  </Frame>
);

const TestimonialThumb = () => (
  <Frame>
    <rect x="8" y="10" width="64" height="28" rx="3" fill={FILL} />
    {[40, 47].map((cx) => (
      <circle key={cx} cx={cx} cy="47" r="3" fill={LINE} />
    ))}
  </Frame>
);

const GenericThumb = () => (
  <Frame>{[14, 22, 30, 38].map((y) => line(8, y, 64))}</Frame>
);

const thumbnails: Record<BlockType, () => React.ReactElement> = {
  hero: HeroThumb,
  richText: RichTextThumb,
  faqAccordion: FaqThumb,
  serviceGrid: GridThumb,
  testimonialCarousel: TestimonialThumb,
  locationGrid: GridThumb,
  teamGrid: TeamThumb,
  ctaBanner: CtaThumb,
  numberedList: NumberedListThumb,
  iconList: IconListThumb,
  richTextColumns: RichTextColumnsThumb,
  imageLeftTextRight: ImageLeftTextRightThumb,
  imageRightTextLeft: ImageRightTextLeftThumb,
  imageTitleBelow: ImageTitleBelowThumb,
  imageTitleBeside: ImageTitleBesideThumb,
};

export function BlockThumbnail({ type }: { type: BlockType }) {
  const Thumb = thumbnails[type] ?? GenericThumb;
  return <Thumb />;
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/block-thumbnails/index.tsx`
Expected: no errors. (The `Record<BlockType, …>` map is exhaustive over all 15 types, so adding a future type would fail the build here — intentional.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/block-thumbnails/index.tsx
git commit -m "$(cat <<'EOF'
Add SVG block thumbnails for the picker

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Block Picker slide-over

**Files:** Create `src/components/admin/BlockPicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { PageTemplate } from "@prisma/client";
import { SlideOver } from "./SlideOver";
import { BlockThumbnail } from "./block-thumbnails";
import { blockRegistry, blockCategories, type BlockType } from "@/lib/cms/blocks";

export function BlockPicker({
  open,
  template,
  onPick,
  onClose,
}: {
  open: boolean;
  template: PageTemplate;
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  // Service Detail pages use their own hero component (Part 3.1), so hide it.
  const available = useMemo(
    () => blockRegistry.filter((m) => !(template === "SERVICE_DETAIL" && m.type === "hero")),
    [template],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (m) => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }, [available, query]);

  return (
    <SlideOver open={open} onClose={onClose} title="Add a block">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search blocks…"
        aria-label="Search block types"
        className="mb-4 w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      <div className="space-y-6">
        {blockCategories.map((cat) => {
          const items = matches.filter((m) => m.category === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} aria-label={cat.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {cat.label}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {items.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => onPick(m.type)}
                    className="flex flex-col gap-2 rounded-lg border border-line p-3 text-left hover:border-brand hover:bg-surface-alt"
                  >
                    <span className="flex items-center justify-center rounded bg-surface-alt p-1">
                      <BlockThumbnail type={m.type} />
                    </span>
                    <span className="text-sm font-semibold text-brand-dark">{m.label}</span>
                    <span className="text-xs text-ink-soft">{m.description}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {matches.length === 0 && (
          <p className="text-center text-sm text-ink-soft">No blocks match “{query}”.</p>
        )}
      </div>
    </SlideOver>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/BlockPicker.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BlockPicker.tsx
git commit -m "$(cat <<'EOF'
Add Block Picker slide-over with categories and search

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Sortable BlockCard

**Files:** Create `src/components/admin/BlockCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { type Block, blockLabel, blockPreview } from "@/lib/cms/blocks";

export function BlockCard({
  id,
  block,
  expanded,
  onToggleExpand,
  onDuplicate,
  onToggleVisible,
  onDelete,
  children,
}: {
  id: string;
  block: Block;
  expanded: boolean;
  onToggleExpand: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const hidden = block.isVisible === false;
  const preview = blockPreview(block);
  const iconBtn = "rounded p-1 hover:bg-surface-alt";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-card border border-line bg-white ${hidden ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          className={`${iconBtn} cursor-grab text-ink-soft`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-brand-dark">{blockLabel(block.type)}</span>
            {hidden && (
              <span className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-ink-soft">
                Hidden
              </span>
            )}
          </div>
          {preview && <p className="truncate text-xs text-ink-soft">{preview}</p>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse block" : "Edit block"}
            aria-expanded={expanded}
            className={iconBtn}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDuplicate} aria-label="Duplicate block" className={iconBtn}>
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleVisible}
            aria-label={hidden ? "Show block" : "Hide block"}
            className={iconBtn}
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete block"
            className={`${iconBtn} text-accent`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt px-3 py-2 text-sm">
          <span className="text-ink">Delete this block?</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
          </span>
        </div>
      )}

      {expanded && <div className="space-y-3 border-t border-line p-4">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/BlockCard.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BlockCard.tsx
git commit -m "$(cat <<'EOF'
Add sortable BlockCard with preview and actions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Rewire PageEditor to the builder shell

**Files:** Modify `src/components/admin/PageEditor.tsx`

This task only changes the top of the file (imports, the `PageEditor` function body's block-list + add-block sections, and adds two small helpers). `BlockFields` and all the `Field`/`RichField`/`Radio`/`Toggle`/`ImageField`/`IconField` helper components are **unchanged** — keep them exactly as they are. The `moved<T>` helper used inside `BlockFields` for item-level reordering also stays.

- [ ] **Step 1: Replace the imports block**

Replace the current import block (lines 1-15) with:

```tsx
"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import {
  type Block,
  type BlockType,
  blockRegistry,
} from "@/lib/cms/blocks";
import { savePage, publishPage } from "@/app/admin/pages/actions";
import { StatusBadge } from "./StatusBadge";
import type { ContentStatus, PageTemplate } from "@prisma/client";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPicker } from "./MediaPicker";
import { IconPicker } from "./IconPicker";
import { BlockCard } from "./BlockCard";
import { BlockPicker } from "./BlockPicker";
```

(`blockLabel` is no longer imported here — it moved into `BlockCard`. `RichTextEditor`, `MediaPicker`, `IconPicker` stay because `BlockFields` and its helpers still use them.)

- [ ] **Step 2: Add an id helper above the component**

Immediately before `export function PageEditor(` (currently line 33), insert:

```tsx
type Item = { id: string; block: Block };

let idCounter = 0;
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  idCounter += 1;
  return `b${Date.now()}-${idCounter}`;
}
```

- [ ] **Step 3: Replace the component state and handlers**

Replace the body of `PageEditor` from the opening `const [blocks, setBlocks]` line down through the closing `function add(type: BlockType) { ... }` (currently lines 42-65) with:

```tsx
  const [items, setItems] = useState<Item[]>(() =>
    initialBlocks.map((block) => ({ id: makeId(), block })),
  );
  const [title, setTitle] = useState(page.title);
  const [template, setTemplate] = useState<PageTemplate>(page.template);
  const [hasSidebar, setHasSidebar] = useState(page.hasSidebar);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateBlock(id: string, patch: Partial<Block>) {
    setItems((arr) =>
      arr.map((it) => (it.id === id ? { ...it, block: { ...it.block, ...patch } as Block } : it)),
    );
  }
  function removeBlock(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  }
  function duplicateBlock(id: string) {
    setItems((arr) => {
      const idx = arr.findIndex((it) => it.id === id);
      if (idx === -1) return arr;
      const copy: Item = { id: makeId(), block: structuredClone(arr[idx].block) };
      return [...arr.slice(0, idx + 1), copy, ...arr.slice(idx + 1)];
    });
  }
  function toggleVisible(id: string) {
    setItems((arr) =>
      arr.map((it) =>
        it.id === id
          ? { ...it, block: { ...it.block, isVisible: it.block.isVisible === false } as Block }
          : it,
      ),
    );
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((arr) => {
      const from = arr.findIndex((it) => it.id === active.id);
      const to = arr.findIndex((it) => it.id === over.id);
      if (from === -1 || to === -1) return arr;
      return arrayMove(arr, from, to);
    });
  }
  function openPicker(index: number) {
    setInsertAt(index);
    setPickerOpen(true);
  }
  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setInsertAt(null);
  }, []);
  function handlePick(type: BlockType) {
    const meta = blockRegistry.find((m) => m.type === type);
    if (!meta) return;
    const item: Item = { id: makeId(), block: meta.create() };
    setItems((arr) => {
      const at = insertAt ?? arr.length;
      return [...arr.slice(0, at), item, ...arr.slice(at)];
    });
    setExpandedId(item.id);
    setPickerOpen(false);
    setInsertAt(null);
  }
```

- [ ] **Step 4: Update the hidden blocks input**

The hidden input currently reads `value={JSON.stringify(blocks)}` (line 70). Change it to:

```tsx
      <input type="hidden" name="blocks" value={JSON.stringify(items.map((it) => it.block))} />
```

- [ ] **Step 5: Replace the block list + add-block sections**

Replace the entire block-list `<div className="space-y-4">…</div>` (the comment `{/* Blocks */}` through its closing tag) **and** the add-block `<div className="rounded-card border border-line bg-white p-4">…</div>` (the comment `{/* Add block */}` through its closing tag) — currently lines 140-198 — with:

```tsx
      {/* Blocks */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-line p-8 text-center">
            <p className="text-sm font-semibold text-brand-dark">No content blocks yet</p>
            <p className="mt-1 text-sm text-ink-soft">
              Add your first block to start building this page.
            </p>
            <button
              type="button"
              onClick={() => openPicker(0)}
              className="mt-3 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              + Add block
            </button>
          </div>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={items.map((it) => it.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((it, i) => (
                  <div key={it.id}>
                    {i > 0 && (
                      <div className="group flex h-4 items-center justify-center">
                        <button
                          type="button"
                          onClick={() => openPicker(i)}
                          aria-label="Insert block here"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft opacity-0 transition hover:border-brand hover:text-brand-dark group-hover:opacity-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <BlockCard
                      id={it.id}
                      block={it.block}
                      expanded={expandedId === it.id}
                      onToggleExpand={() =>
                        setExpandedId((cur) => (cur === it.id ? null : it.id))
                      }
                      onDuplicate={() => duplicateBlock(it.id)}
                      onToggleVisible={() => toggleVisible(it.id)}
                      onDelete={() => removeBlock(it.id)}
                    >
                      <BlockFields block={it.block} onChange={(patch) => updateBlock(it.id, patch)} />
                    </BlockCard>
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            <button
              type="button"
              onClick={() => openPicker(items.length)}
              className="w-full rounded-card border border-dashed border-line py-3 text-sm font-semibold text-brand-dark hover:border-brand hover:bg-surface-alt"
            >
              + Add block
            </button>
          </>
        )}
      </div>

      <BlockPicker
        open={pickerOpen}
        template={template}
        onPick={handlePick}
        onClose={closePicker}
      />
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/PageEditor.tsx`
Expected: no errors. Common things to confirm if it fails:
- No remaining references to the deleted `blocks`, `setBlocks`, `move`, `remove`, `add`, or `blockLabel` in this file.
- `BlockFields` and the helper components below it are untouched and still compile.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Rewire PageEditor to dnd-kit cards and block picker

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Full verification

**Files:** none modified.

- [ ] **Step 1: Lint all created/modified files**

Run:
```bash
npx eslint src/lib/cms/blocks.ts src/components/admin/SlideOver.tsx src/components/admin/block-thumbnails/index.tsx src/components/admin/BlockPicker.tsx src/components/admin/BlockCard.tsx src/components/admin/PageEditor.tsx
```
Expected: no errors (warnings acceptable). Fix any errors before continuing.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: "Compiled successfully"; `/admin/pages/[id]` still appears in the route list.

- [ ] **Step 4: Human verification note (not a code step)**

The editor is auth-gated, so verify manually: log in to `/admin`, open a page in Pages, and confirm:
- Blocks render as collapsed cards with a type label and an 80-char content preview.
- Dragging the grip handle reorders cards; keyboard reorder works (focus a handle, press Space, arrow keys, Space).
- "Edit" expands a card inline with its fields; "Collapse" closes it.
- "Duplicate" inserts a copy directly below; "Hide"/"Show" toggles the dimmed state; "Delete" asks for confirm before removing.
- "+ Add block" (bottom) and the hover "+" between cards open the Block Picker slide-over.
- The picker groups blocks into the 4 categories with thumbnails + descriptions, search filters them, and **Service Detail** pages do not list the Hero block.
- The slide-over traps focus and returns focus to the trigger on close (Esc and backdrop both close it).
- Save draft / Save & publish still persist blocks correctly.

(No commit; report as a manual follow-up.)

---

## Self-review

**Spec coverage (design doc → tasks):**
- `SlideOver` (overlay, Esc, focus trap, return focus) → Task 3. ✔
- SVG thumbnails (7 new detailed + 8 lightweight + fallback) → Task 4. ✔
- Block Picker (search, 4 categories, thumbnails, descriptions, template filter hiding `hero`) → Task 5 (+ category metadata in Task 2). ✔
- Collapsed `BlockCard` (drag handle, 80-char preview, Edit/Duplicate/Hide/Delete, inline delete confirm, inline-expand children) → Task 6 (+ `blockPreview` in Task 2). ✔
- dnd-kit reorder, mouse + keyboard → Task 1 (deps) + Task 7 (`DndContext`/`SortableContext`/sensors). ✔
- "+ Add block" at bottom + hover "+" between blocks at the right index → Task 7. ✔
- Stable ids for blocks (so reorder/duplicate are safe) → Task 7 `Item`/`makeId`. ✔
- Save path unchanged (hidden `blocks` input from `items.map`) → Task 7 Step 4. ✔
- a11y aria-labels on icon-only buttons → Tasks 3, 5, 6, 7. ✔
- Out of scope (editor slide-over, autosave) → correctly absent; editing stays inline-expand. ✔

**Placeholder scan:** no TBD/TODO; every code step shows complete code and exact commands. ✔

**Type consistency:** `Item = { id, block }` defined in Task 7 and used by `setItems`, `BlockCard` (`id`, `block`), and `BlockFields` (`block`, `onChange`). `BlockPicker` props (`open`, `template`, `onPick`, `onClose`) match the call site in Task 7. `onPick: (type: BlockType) => void` matches `handlePick`. `blockPreview`/`blockLabel`/`blockCategories`/`BlockCategory` defined in Task 2 and consumed in Tasks 5-6. `BlockThumbnail({ type })` defined in Task 4 and used in Task 5. `SlideOver` props match `BlockPicker`'s usage. ✔
