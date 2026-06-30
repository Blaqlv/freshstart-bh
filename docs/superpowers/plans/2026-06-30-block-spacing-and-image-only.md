# Block Spacing (opt-in) + Image-Only Block — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in per-block vertical spacing (no live page changes until an admin opts in) and a minimal Image-Only block, on branch `feat/block-spacing-and-image-only`.

**Architecture:** Blocks are a JSON discriminated union (`src/lib/cms/blocks.ts`) rendered by a server `switch` (`BlockRenderer.tsx`) and edited in whole-page React state with Server-Action autosave (`PageEditor.tsx`). Spacing is expressed as two optional union fields and resolved by a pure function consumed by the renderer; the editor mutates state and rides existing autosave.

**Tech Stack:** Next 16 / React 19, TypeScript, Prisma 6, Tailwind v4, `@dnd-kit`, TinyMCE. Tests are plain `.mjs` + `node:assert`, run with `npx tsx tests/<file>.mjs`. Type-check with `npx tsc --noEmit`.

### Deviations from the spec (`docs/superpowers/specs/2026-06-30-block-spacing-and-image-only-design.md`)
- **Field names `spaceAbove`/`spaceBelow`** (not `spacingTop`/`spacingBottom`). Reason: `horizontalDivider` already declares `spacingTop`/`spacingBottom` with different semantics (`Exclude<SpacerSize,"custom">`); reusing the names on the shared union intersection would collide and narrow the divider's type.
- **`verticalSpacer` + `horizontalDivider` ignore wrapper spacing entirely** (they own purpose-built spacing). The shared spacing UI is hidden for them and `resolveBlockSpacing` returns zeroes for them.
- **Images use plain `<img>`** (repo convention), not `next/image`.

### Block classes (used throughout)
- **Banded** (own a colored background; keep internal padding, never flush): `hero`, `ctaBanner`, `testimonialCarousel`, `teamGrid`.
- **No-wrapper** (own spacing; ignore wrapper): `verticalSpacer`, `horizontalDivider`.
- **Plain** (everything else): legacy outer padding is `py-12` (48px), except `columnLayout` which is `py-8` (32px). Plain blocks go *flush* and the wrapper supplies padding once opted in.

---

## Task 1: Pure spacing module + tests

**Files:**
- Create: `src/lib/cms/spacing.ts`
- Create: `tests/block-spacing.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/block-spacing.mjs`:

```js
// tests/block-spacing.mjs
import assert from "node:assert";
import {
  spacingPxMap,
  spacingLabelMap,
  spacingToPx,
  resolveBlockSpacing,
} from "../src/lib/cms/spacing.ts";

const keys = ["none", "xs", "sm", "md", "lg", "xl", "xxl"];
assert.deepStrictEqual(Object.keys(spacingPxMap), keys, "px map keys");
assert.deepStrictEqual(Object.keys(spacingLabelMap), keys, "label map keys");
assert.strictEqual(spacingPxMap.md, 32, "md px");
assert.strictEqual(spacingToPx("lg"), 56, "lg px");
assert.strictEqual(spacingToPx(undefined), 0, "undefined -> 0");
assert.strictEqual(spacingToPx("none"), 0, "none -> 0");

// plain, unset -> legacy render (no wrapper, not flush)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "richText" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "plain unset",
);

// plain, both set -> flush + wrapper px
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "richText", spaceAbove: "lg", spaceBelow: "sm" }),
  { managed: true, flush: true, paddingTop: 56, paddingBottom: 16 },
  "plain both set",
);

// plain, half-set -> unset side falls back to legacy 48 (py-12)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "richText", spaceAbove: "xl" }),
  { managed: true, flush: true, paddingTop: 80, paddingBottom: 48 },
  "plain half set",
);

// columnLayout legacy is 32 (py-8)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "columnLayout", spaceBelow: "md" }),
  { managed: true, flush: true, paddingTop: 32, paddingBottom: 32 },
  "columnLayout legacy 32",
);

// banded -> never flush; wrapper only external gap
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "testimonialCarousel" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "banded unset",
);
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "hero", spaceAbove: "xxl" }),
  { managed: false, flush: false, paddingTop: 120, paddingBottom: 0 },
  "banded set",
);

// spacer/divider -> ignore wrapper spacing entirely (no double-spacing)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "verticalSpacer", spaceAbove: "xl", spaceBelow: "xl" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "spacer ignores wrapper",
);
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "horizontalDivider", spaceAbove: "lg" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "divider ignores wrapper",
);

console.log("block-spacing test PASSED");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/block-spacing.mjs`
Expected: FAIL — cannot resolve module `../src/lib/cms/spacing.ts` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/cms/spacing.ts`:

```ts
// src/lib/cms/spacing.ts
import type { BlockType } from "./blocks";

/** Admin-facing vertical spacing scale (wrapper padding around a block). */
export type BlockSpacing = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export const spacingPxMap: Record<BlockSpacing, number> = {
  none: 0,
  xs: 8,
  sm: 16,
  md: 32,
  lg: 56,
  xl: 80,
  xxl: 120,
};

export const spacingLabelMap: Record<BlockSpacing, string> = {
  none: "None",
  xs: "XS (8px)",
  sm: "Small (16px)",
  md: "Medium (32px)",
  lg: "Large (56px)",
  xl: "XL (80px)",
  xxl: "XXL (120px)",
};

export function spacingToPx(value: BlockSpacing | undefined): number {
  return value ? spacingPxMap[value] : 0;
}

/** Blocks that own a colored background — keep their internal padding, never flush. */
const BANDED_BLOCK_TYPES = new Set<BlockType>([
  "hero",
  "ctaBanner",
  "testimonialCarousel",
  "teamGrid",
]);

/** Blocks with purpose-built spacing config — the wrapper never touches them. */
const NO_WRAPPER_SPACING = new Set<BlockType>(["verticalSpacer", "horizontalDivider"]);

/** Legacy outer vertical padding (px per side) for plain blocks, used as the
 *  fallback for a side left unset so a half-configured block never collapses. */
const LEGACY_PLAIN_PX: Partial<Record<BlockType, number>> = { columnLayout: 32 };
const DEFAULT_PLAIN_PX = 48; // py-12

export type ResolvedSpacing = {
  /** True when the wrapper is the source of vertical padding (plain, opted-in). */
  managed: boolean;
  /** True when the block component must drop its own outer vertical padding. */
  flush: boolean;
  paddingTop: number;
  paddingBottom: number;
};

/** Pure decision for how a block participates in wrapper spacing. */
export function resolveBlockSpacing(block: {
  type: BlockType;
  spaceAbove?: BlockSpacing;
  spaceBelow?: BlockSpacing;
}): ResolvedSpacing {
  const { type, spaceAbove: top, spaceBelow: bottom } = block;

  if (NO_WRAPPER_SPACING.has(type)) {
    return { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 };
  }

  if (BANDED_BLOCK_TYPES.has(type)) {
    // Band keeps internal padding; wrapper adds an external gap only when set.
    return {
      managed: false,
      flush: false,
      paddingTop: spacingToPx(top),
      paddingBottom: spacingToPx(bottom),
    };
  }

  const hasSpacing = top !== undefined || bottom !== undefined;
  if (!hasSpacing) {
    return { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 };
  }

  const legacy = LEGACY_PLAIN_PX[type] ?? DEFAULT_PLAIN_PX;
  return {
    managed: true,
    flush: true,
    paddingTop: top !== undefined ? spacingToPx(top) : legacy,
    paddingBottom: bottom !== undefined ? spacingToPx(bottom) : legacy,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/block-spacing.mjs`
Expected: prints `block-spacing test PASSED`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cms/spacing.ts tests/block-spacing.mjs
git commit -m "feat(cms): pure block-spacing scale + resolveBlockSpacing (TDD)"
```

---

## Task 2: Add `spaceAbove`/`spaceBelow` to the block union

**Files:**
- Modify: `src/lib/cms/blocks.ts` (top import + the shared `Block` intersection near line 263-282)

- [ ] **Step 1: Add the type-only import**

At the top of `src/lib/cms/blocks.ts` (after the file's opening comment, before `export type BlockType`), add:

```ts
import type { BlockSpacing } from "./spacing";
```

(Type-only both directions — `spacing.ts` imports `type BlockType` from here — so there is no runtime import cycle.)

- [ ] **Step 2: Extend the shared intersection**

In `src/lib/cms/blocks.ts`, change the tail of the `Block` union from:

```ts
) & { isVisible?: boolean };
```

to:

```ts
) & { isVisible?: boolean; spaceAbove?: BlockSpacing; spaceBelow?: BlockSpacing };
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors. (`horizontalDivider`'s own `spacingTop`/`spacingBottom` are untouched and do not collide.)

- [ ] **Step 4: Re-run the spacing test (sanity)**

Run: `npx tsx tests/block-spacing.mjs`
Expected: `block-spacing test PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cms/blocks.ts
git commit -m "feat(cms): add optional spaceAbove/spaceBelow to block union"
```

---

## Task 3: Apply spacing wrapper in BlockRenderer

**Files:**
- Modify: `src/components/cms/BlockRenderer.tsx`

- [ ] **Step 1: Import the resolver and add a padding helper**

In `src/components/cms/BlockRenderer.tsx`, add to the imports (near line 5-6):

```ts
import { resolveBlockSpacing } from "@/lib/cms/spacing";
```

Add this module-level helper just below the imports (above `heroHeightMap`):

```ts
/** Plain blocks drop their own outer vertical padding when the wrapper manages it. */
const vpad = (flush: boolean, base: string) => (flush ? "py-0" : base);
```

- [ ] **Step 2: Wrap each top-level block and thread `flush`**

Replace the `BlockRenderer` function body (lines 81-91) with:

```tsx
/** Renders an ordered list of CMS blocks. Server component (queries live data). */
export async function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .filter((block) => block.isVisible !== false)
        .map((block, i) => {
          const sp = resolveBlockSpacing(block);
          return (
            <div
              key={i}
              data-block-type={block.type}
              style={{
                paddingTop: sp.paddingTop || undefined,
                paddingBottom: sp.paddingBottom || undefined,
              }}
            >
              <BlockView block={block} flush={sp.flush} />
            </div>
          );
        })}
    </>
  );
}
```

- [ ] **Step 3: Accept `flush` in BlockView and apply to plain inline cases**

Change the `BlockView` signature (line 93) to:

```tsx
async function BlockView({ block, flush = false }: { block: Block; flush?: boolean }) {
```

Apply `vpad(flush, …)` to the **plain inline** cases only (leave banded `hero`, `ctaBanner`, `testimonialCarousel`, `teamGrid` exactly as they are):

- `richText` (line 130): `<section className={vpad(flush, "py-12")}>`
- `faqAccordion` (line 183): `<section className={vpad(flush, "py-12")}>`
- `serviceGrid` (line 210): `<section className={vpad(flush, "py-12")}>`
- `locationGrid` (line 260): `<section className={vpad(flush, "py-12")}>`
- `columnLayout` both `<Container className="py-8">` (lines 349 and 369): `<Container className={vpad(flush, "py-8")}>`

- [ ] **Step 4: Pass `flush` to delegated components**

Update the delegated render cases (lines 298-323) to forward `flush`:

```tsx
    case "numberedList":
      return <NumberedListBlock block={block} flush={flush} />;
    case "iconList":
      return <IconListBlock block={block} flush={flush} />;
    case "richTextColumns":
      return <RichTextColumnsBlock block={block} flush={flush} />;
    case "imageLeftTextRight":
      return <ImageTextSplitBlock block={block} imageSide="left" flush={flush} />;
    case "imageRightTextLeft":
      return <ImageTextSplitBlock block={block} imageSide="right" flush={flush} />;
    case "imageTitleBelow":
      return <ImageTitleBelowBlock block={block} flush={flush} />;
    case "imageTitleBeside":
      return <ImageTitleBesideBlock block={block} flush={flush} />;
    case "verticalSpacer":
      return <VerticalSpacerBlock block={block} />;
    case "horizontalDivider":
      return <HorizontalDividerBlock block={block} />;
```

(Nested column children keep legacy behavior: the existing `<BlockView key={i} block={child} />` at line 341 stays as-is — `flush` defaults to `false`.)

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: errors ONLY in the delegated child components that don't yet accept `flush` (fixed in Task 4). If you see unrelated errors, fix them. Proceed to Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/components/cms/BlockRenderer.tsx
git commit -m "feat(cms): spacing wrapper + flush threading in BlockRenderer"
```

---

## Task 4: Make plain delegated components flush-aware

**Files (each: add `flush?: boolean` param, swap outer `py-12`):**
- Modify: `src/components/cms/blocks/NumberedListBlock.tsx`
- Modify: `src/components/cms/blocks/IconListBlock.tsx`
- Modify: `src/components/cms/blocks/RichTextColumnsBlock.tsx`
- Modify: `src/components/cms/blocks/ImageTextSplitBlock.tsx`
- Modify: `src/components/cms/blocks/ImageTitleBelowBlock.tsx`
- Modify: `src/components/cms/blocks/ImageTitleBesideBlock.tsx`

- [ ] **Step 1: NumberedListBlock**

Change the component signature and the outer `<section>`:

```tsx
export function NumberedListBlock({ block, flush = false }: { block: NumberedListBlockType; flush?: boolean }) {
  return (
    <section className={flush ? "py-0" : "py-12"}>
```

(Keep the rest unchanged. The existing type import alias name stays; only add `flush` to the destructured props and the props type. If the file imports the type as a different alias, reuse that alias.)

- [ ] **Step 2: IconListBlock**

```tsx
export function IconListBlock({ block, flush = false }: { block: IconListBlockType; flush?: boolean }) {
  return (
    <section className={flush ? "py-0" : "py-12"}>
```

- [ ] **Step 3: RichTextColumnsBlock**

```tsx
export function RichTextColumnsBlock({ block, flush = false }: { block: RichTextColumnsBlockType; flush?: boolean }) {
  return (
    <section className={flush ? "py-0" : "py-12"}>
```

- [ ] **Step 4: ImageTextSplitBlock** (note: this one already takes `imageSide`)

Add `flush` to its existing props type and destructuring, and swap the outer `<section className="py-12">` (line 29) to `<section className={flush ? "py-0" : "py-12"}>`. Example signature:

```tsx
export function ImageTextSplitBlock({
  block,
  imageSide,
  flush = false,
}: {
  block: ImageTextSplitBlockType;
  imageSide: "left" | "right";
  flush?: boolean;
}) {
```

(Use the file's existing block-type alias and `imageSide` type verbatim — only add the `flush` field.)

- [ ] **Step 5: ImageTitleBelowBlock**

```tsx
export function ImageTitleBelowBlock({ block, flush = false }: { block: ImageTitleBelowBlockType; flush?: boolean }) {
  return (
    <section className={flush ? "py-0" : "py-12"}>
```

- [ ] **Step 6: ImageTitleBesideBlock**

```tsx
export function ImageTitleBesideBlock({ block, flush = false }: { block: ImageTitleBesideBlockType; flush?: boolean }) {
  return (
    <section className={flush ? "py-0" : "py-12"}>
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/cms/blocks/NumberedListBlock.tsx src/components/cms/blocks/IconListBlock.tsx src/components/cms/blocks/RichTextColumnsBlock.tsx src/components/cms/blocks/ImageTextSplitBlock.tsx src/components/cms/blocks/ImageTitleBelowBlock.tsx src/components/cms/blocks/ImageTitleBesideBlock.tsx
git commit -m "feat(cms): flush-aware outer padding on plain block components"
```

---

## Task 5: Shared SpacingControls component

**Files:**
- Create: `src/components/admin/SpacingControls.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/admin/SpacingControls.tsx`:

```tsx
"use client";

import { SegmentedControl } from "./controls";
import { type BlockSpacing, spacingPxMap } from "@/lib/cms/spacing";

const OPTIONS: { value: BlockSpacing; label: string }[] = [
  { value: "none", label: "None" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "SM" },
  { value: "md", label: "MD" },
  { value: "lg", label: "LG" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
];

/**
 * Two segmented controls (Space Above / Below) with a live px readout. Selecting
 * any value — including "None" — opts the block into wrapper-managed spacing and
 * suppresses its built-in padding. Leaving both untouched keeps legacy spacing.
 */
export function SpacingControls({
  spaceAbove,
  spaceBelow,
  onChange,
}: {
  spaceAbove?: BlockSpacing;
  spaceBelow?: BlockSpacing;
  onChange: (patch: { spaceAbove?: BlockSpacing; spaceBelow?: BlockSpacing }) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <SegmentedControl
          label="Space above"
          value={spaceAbove ?? "none"}
          options={OPTIONS}
          onChange={(v) => onChange({ spaceAbove: v })}
        />
        <p className="mt-1 text-xs text-ink-soft">{spacingPxMap[spaceAbove ?? "none"]}px</p>
      </div>
      <div>
        <SegmentedControl
          label="Space below"
          value={spaceBelow ?? "none"}
          options={OPTIONS}
          onChange={(v) => onChange({ spaceBelow: v })}
        />
        <p className="mt-1 text-xs text-ink-soft">{spacingPxMap[spaceBelow ?? "none"]}px</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/SpacingControls.tsx
git commit -m "feat(admin): shared SpacingControls (Space Above/Below + px readout)"
```

---

## Task 6: Spacing section in the full Block Editor Panel

**Files:**
- Modify: `src/components/admin/BlockEditorPanel.tsx`

- [ ] **Step 1: Render the collapsible section**

Replace the body of `src/components/admin/BlockEditorPanel.tsx` with (adds the import, the `showSpacing` guard, and the `<details>` block):

```tsx
"use client";

import { useState } from "react";
import { SlideOver } from "./SlideOver";
import { BlockFields } from "./BlockFields";
import { SpacingControls } from "./SpacingControls";
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
  const showSpacing = draft.type !== "verticalSpacer" && draft.type !== "horizontalDivider";

  return (
    <SlideOver open onClose={onCancel} title={`Edit ${blockLabel(draft.type)}`}>
      <div className="space-y-3">
        <BlockFields
          block={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }) as Block)}
        />
        {showSpacing && (
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Spacing
            </summary>
            <div className="mt-3">
              <SpacingControls
                spaceAbove={draft.spaceAbove}
                spaceBelow={draft.spaceBelow}
                onChange={(patch) => setDraft((d) => ({ ...d, ...patch }) as Block)}
              />
            </div>
          </details>
        )}
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

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BlockEditorPanel.tsx
git commit -m "feat(admin): collapsible Spacing section in block editor panel"
```

---

## Task 7: Quick spacing popover on the block card + PageEditor wiring

**Files:**
- Modify: `src/components/admin/BlockCard.tsx`
- Modify: `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Add the popover to BlockCard**

In `src/components/admin/BlockCard.tsx`:

Add `ArrowUpDown` to the lucide import (line 6):

```tsx
import { GripVertical, Pencil, Copy, Eye, EyeOff, Trash2, ArrowUpDown } from "lucide-react";
```

Add `SpacingControls` import and the `BlockSpacing` type:

```tsx
import { SpacingControls } from "./SpacingControls";
import type { BlockSpacing } from "@/lib/cms/spacing";
```

Add `onSpacingChange` to the props type and destructuring:

```tsx
export function BlockCard({
  id,
  block,
  onEdit,
  onDuplicate,
  onToggleVisible,
  onDelete,
  onSpacingChange,
}: {
  id: string;
  block: Block;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  onSpacingChange: (patch: { spaceAbove?: BlockSpacing; spaceBelow?: BlockSpacing }) => void;
}) {
```

Add local state below `const [confirmDelete, setConfirmDelete] = useState(false);`:

```tsx
  const [spacingOpen, setSpacingOpen] = useState(false);
  const showSpacing = block.type !== "verticalSpacer" && block.type !== "horizontalDivider";
```

In the action-row `<div className="flex items-center gap-1">` (line 68), add this as the FIRST child (before the Edit button):

```tsx
          {showSpacing && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpacingOpen((o) => !o)}
                aria-label="Adjust spacing"
                aria-expanded={spacingOpen}
                className={iconBtn}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
              {spacingOpen && (
                <div className="absolute right-0 z-20 mt-1 w-64 rounded-card border border-line bg-white p-3 shadow-lg">
                  <SpacingControls
                    spaceAbove={block.spaceAbove}
                    spaceBelow={block.spaceBelow}
                    onChange={onSpacingChange}
                  />
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 2: Wire PageEditor**

In `src/components/admin/PageEditor.tsx`, add an update handler near `toggleVisible` (after line 109):

```tsx
  function updateBlockSpacing(
    id: string,
    patch: { spaceAbove?: import("@/lib/cms/spacing").BlockSpacing; spaceBelow?: import("@/lib/cms/spacing").BlockSpacing },
  ) {
    setItems((arr) =>
      arr.map((it) => (it.id === id ? { ...it, block: { ...it.block, ...patch } as Block } : it)),
    );
    dirtyRef.current = true;
    setTimeout(() => {
      void autosave();
    }, 0);
  }
```

Pass it to `BlockCard` (line 303-310) by adding the prop:

```tsx
                    <BlockCard
                      id={it.id}
                      block={it.block}
                      onEdit={() => setEditingId(it.id)}
                      onDuplicate={() => duplicateBlock(it.id)}
                      onToggleVisible={() => toggleVisible(it.id)}
                      onDelete={() => removeBlock(it.id)}
                      onSpacingChange={(patch) => updateBlockSpacing(it.id, patch)}
                    />
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/BlockCard.tsx src/components/admin/PageEditor.tsx
git commit -m "feat(admin): quick spacing popover on block card (rides autosave)"
```

---

## Task 8: Page-level default spacing (the one schema change)

**Files:**
- Modify: `prisma/schema.prisma` (Page model, ~line 99)
- Modify: `src/app/admin/pages/actions.ts` (`persistDraft`)
- Modify: `src/app/admin/pages/[id]/page.tsx` (PageData)
- Modify: `src/components/admin/PageEditor.tsx` (state, hidden input, settings control, `handlePick`)

- [ ] **Step 1: Add the Prisma field**

In `prisma/schema.prisma`, inside `model Page`, add after the `hasSidebar` line (line 99):

```prisma
  // Default wrapper spacing pre-applied to NEW blocks added to this page (opt-in).
  defaultBlockSpacing String?
```

- [ ] **Step 2: Generate + apply the migration (local dev DB)**

Run: `npx prisma migrate dev --name page-default-block-spacing`
Expected: creates `prisma/migrations/<ts>_page_default_block_spacing/migration.sql` (an `ALTER TABLE "Page" ADD COLUMN "defaultBlockSpacing" TEXT;`), applies it locally, and regenerates the client.

> **Deploy note:** Vercel build does NOT run migrations for this project. After merge, apply this migration to production manually (through the pooler) per `DEPLOY.md`. The column is nullable, so the app is a no-op until a default is set.

- [ ] **Step 3: Persist the field in the Server Action**

In `src/app/admin/pages/actions.ts`, inside `persistDraft`'s `db.page.update(... data: {...})` (after the `hasSidebar` line, ~line 75), add:

```ts
        defaultBlockSpacing:
          (String(formData.get("defaultBlockSpacing") ?? "") || null) as string | null,
```

- [ ] **Step 4: Pass it through the editor page**

In `src/app/admin/pages/[id]/page.tsx`, add to the `page={{ … }}` object passed to `<PageEditor>` (after `hasSidebar: page.hasSidebar,`):

```tsx
          defaultBlockSpacing: page.defaultBlockSpacing ?? "",
```

- [ ] **Step 5: Wire PageEditor state + control + new-block default**

In `src/components/admin/PageEditor.tsx`:

Add the import near the other `blocks` imports:

```tsx
import type { BlockSpacing } from "@/lib/cms/spacing";
```

Add `defaultBlockSpacing: string;` to the `PageData` type (after `hasSidebar: boolean;`, line 44).

Add state near `const [hasSidebar, …]` (line 73):

```tsx
  const [defaultBlockSpacing, setDefaultBlockSpacing] = useState<BlockSpacing | "">(
    (page.defaultBlockSpacing as BlockSpacing | "") ?? "",
  );
```

Add a hidden input after the `hasSidebar` hidden input (line 197):

```tsx
      <input type="hidden" name="defaultBlockSpacing" value={defaultBlockSpacing} />
```

Add `defaultBlockSpacing` to the dirty-tracking effect deps (line 161) so changing it marks the form dirty:

```tsx
  }, [items, title, template, hasSidebar, defaultBlockSpacing]);
```

Add a control to the template/settings card (inside the `<div className="space-y-3 rounded-card border border-line bg-white p-4">`, after the `template === "GENERAL"` Toggle block, line 263). Use the existing `SegmentedControl` import (add it to the imports from `./controls` if not present):

```tsx
        <SegmentedControl
          label="Default spacing for new blocks"
          value={defaultBlockSpacing}
          options={[
            { value: "", label: "Off" },
            { value: "xs", label: "XS" },
            { value: "sm", label: "SM" },
            { value: "md", label: "MD" },
            { value: "lg", label: "LG" },
            { value: "xl", label: "XL" },
            { value: "xxl", label: "XXL" },
          ]}
          onChange={(v) => setDefaultBlockSpacing(v as BlockSpacing | "")}
        />
```

Add the `SegmentedControl` import at the top (it is currently not imported in PageEditor):

```tsx
import { SegmentedControl } from "./controls";
```

Update `handlePick` (line 128-139) to pre-apply the default to new blocks (skipping spacer/divider):

```tsx
  function handlePick(type: BlockType) {
    const meta = blockRegistry.find((m) => m.type === type);
    if (!meta) return;
    const base = meta.create();
    const block: Block =
      defaultBlockSpacing && type !== "verticalSpacer" && type !== "horizontalDivider"
        ? ({ ...base, spaceAbove: defaultBlockSpacing, spaceBelow: defaultBlockSpacing } as Block)
        : base;
    const item: Item = { id: makeId(), block };
    setItems((arr) => {
      const at = insertAt ?? arr.length;
      return [...arr.slice(0, at), item, ...arr.slice(at)];
    });
    setEditingId(item.id);
    setPickerOpen(false);
    setInsertAt(null);
  }
```

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/admin/pages/actions.ts "src/app/admin/pages/[id]/page.tsx" src/components/admin/PageEditor.tsx
git commit -m "feat(cms): per-page default block spacing for new blocks"
```

---

## Task 9: Image-Only — type, registry, preview + tests

**Files:**
- Modify: `src/lib/cms/blocks.ts`
- Create: `tests/blocks-image-only.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/blocks-image-only.mjs`:

```js
// tests/blocks-image-only.mjs
import assert from "node:assert";
import { blockRegistry, parseBlocks, blockPreview } from "../src/lib/cms/blocks.ts";

const meta = blockRegistry.find((m) => m.type === "imageOnly");
assert.ok(meta, "imageOnly is registered");
assert.strictEqual(meta.category, "images", "imageOnly category is images");

const created = meta.create();
assert.strictEqual(created.type, "imageOnly", "create() type");
assert.deepStrictEqual(created.image, { url: "", alt: "" }, "create() image default");

// parseBlocks keeps imageOnly and tolerates spaceAbove/spaceBelow
const parsed = parseBlocks([
  { type: "imageOnly", image: { url: "/x.jpg", alt: "X" }, spaceAbove: "lg" },
]);
assert.strictEqual(parsed.length, 1, "parsed length");
assert.strictEqual(parsed[0].spaceAbove, "lg", "spaceAbove preserved");

// preview falls back to alt text
assert.strictEqual(
  blockPreview({ type: "imageOnly", image: { url: "/x.jpg", alt: "Sunset" } }),
  "Sunset",
  "preview uses alt",
);

console.log("blocks-image-only test PASSED");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/blocks-image-only.mjs`
Expected: FAIL — `meta` is undefined (`imageOnly` not registered).

- [ ] **Step 3: Add the type to the BlockType union**

In `src/lib/cms/blocks.ts`, add `| "imageOnly"` to the `BlockType` union (after `| "horizontalDivider"`, line 25):

```ts
  | "horizontalDivider"
  | "imageOnly";
```

- [ ] **Step 4: Add the ImageOnlyBlock type**

Add after the `ImageTitleBesideBlock` type (after line 183):

```ts
export type ImageOnlyBlock = {
  type: "imageOnly";
  image: { url: string; alt: string }; // alt required (enforced in the editor)
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  aspectRatio?: "16/9" | "4/3" | "1/1" | "3/2" | "original";
  objectFit?: "cover" | "contain"; // only when aspectRatio !== "original"
  align?: "left" | "center" | "right"; // only when maxWidth !== "full"
  rounded?: boolean;
  linkUrl?: string;
  linkOpensNewTab?: boolean;
  caption?: string; // plain text
};
```

- [ ] **Step 5: Add it to the Block union**

In the `Block` union (lines 263-282), add `| ImageOnlyBlock` (e.g. after `| ImageTitleBesideBlock`):

```ts
  | ImageTitleBesideBlock
  | ImageOnlyBlock
```

- [ ] **Step 6: Register it**

Add this entry to `blockRegistry` (after the `imageTitleBeside` entry, before `columnLayout`, line 451):

```ts
  {
    type: "imageOnly",
    label: "Image Only",
    description:
      "A single standalone image with no title or text — ideal for visual breaks between sections.",
    category: "images",
    create: () => ({ type: "imageOnly", image: { url: "", alt: "" }, maxWidth: "full", aspectRatio: "original" }),
  },
```

- [ ] **Step 7: Add a preview case**

In `blockPreview`'s `switch` (line 512), add before `case "columnLayout"`:

```ts
    case "imageOnly":
      raw = block.image.alt || block.caption || "Image";
      break;
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx tsx tests/blocks-image-only.mjs`
Expected: prints `blocks-image-only test PASSED`.

- [ ] **Step 9: Type-check (note: this surfaces the missing thumbnail entry, fixed in Task 12)**

Run: `npx tsc --noEmit`
Expected: an error in `block-thumbnails/index.tsx` that `imageOnly` is missing from the `Record<BlockType, …>`. That is expected and fixed in Task 12. No other errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/cms/blocks.ts tests/blocks-image-only.mjs
git commit -m "feat(cms): register imageOnly block type + preview (TDD)"
```

---

## Task 10: ImageOnlyBlock render component + renderer case

**Files:**
- Create: `src/components/cms/blocks/ImageOnlyBlock.tsx`
- Modify: `src/components/cms/BlockRenderer.tsx`

- [ ] **Step 1: Write the component (plain `<img>`, flush-aware)**

Create `src/components/cms/blocks/ImageOnlyBlock.tsx`:

```tsx
import { Container } from "@/components/ui/Container";
import type { ImageOnlyBlock as ImageOnlyBlockType } from "@/lib/cms/blocks";

const maxWidthClass: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

const aspectClass: Record<string, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
};

const alignClass: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

export function ImageOnlyBlock({
  block,
  flush = false,
}: {
  block: ImageOnlyBlockType;
  flush?: boolean;
}) {
  const { image, maxWidth = "full", aspectRatio = "original", objectFit = "cover", align = "center", rounded, linkUrl, linkOpensNewTab, caption } = block;
  if (!image?.url) return null;

  const rounding = rounded ? "overflow-hidden rounded-card" : "";
  const fit = objectFit === "contain" ? "object-contain" : "object-cover";

  const img =
    aspectRatio !== "original" ? (
      <div className={`relative w-full ${aspectClass[aspectRatio]} ${rounding}`}>
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${fit}`}
        />
      </div>
    ) : (
      <img src={image.url} alt={image.alt} loading="lazy" className={`h-auto w-full ${rounding}`} />
    );

  const visual = linkUrl ? (
    <a
      href={linkUrl}
      target={linkOpensNewTab ? "_blank" : undefined}
      rel={linkOpensNewTab ? "noopener noreferrer" : undefined}
      aria-label={image.alt || undefined}
    >
      {img}
    </a>
  ) : (
    img
  );

  return (
    <section className={flush ? "py-0" : "py-12"}>
      <Container>
        <figure className={`${maxWidthClass[maxWidth]} ${maxWidth !== "full" ? alignClass[align] : ""}`}>
          {visual}
          {caption && (
            <figcaption className="mt-2 text-center text-sm text-ink-soft">{caption}</figcaption>
          )}
        </figure>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Register in BlockRenderer**

In `src/components/cms/BlockRenderer.tsx`, add the import (near the other `./blocks/*` imports):

```ts
import { ImageOnlyBlock } from "./blocks/ImageOnlyBlock";
```

Add a case in `BlockView`'s `switch` (next to the other image cases, ~line 317):

```tsx
    case "imageOnly":
      return <ImageOnlyBlock block={block} flush={flush} />;
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: still only the Task-12 thumbnail error; no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/cms/blocks/ImageOnlyBlock.tsx src/components/cms/BlockRenderer.tsx
git commit -m "feat(cms): ImageOnlyBlock render component"
```

---

## Task 11: Image-Only editor form

**Files:**
- Modify: `src/components/admin/BlockFields.tsx`

- [ ] **Step 1: Add the `imageOnly` case**

In `src/components/admin/BlockFields.tsx`, add this case to the `switch` (after the `imageTitleBeside` case, before `case "columnLayout":`, line 322). It reuses the existing `ImageField`, `Field`, `Radio`, and `Toggle` helpers in this file:

```tsx
    case "imageOnly":
      return (
        <>
          <ImageField label="Image" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <div>
            <Field label="Alt text (required)" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
            {!block.image.alt.trim() && (
              <p className="mt-1 text-xs text-accent">Alt text is required for accessibility.</p>
            )}
          </div>
          <Radio
            label="Max width"
            value={block.maxWidth ?? "full"}
            options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "XLarge" }, { value: "full", label: "Full width" }]}
            onChange={(v) => onChange({ maxWidth: v } as Partial<Block>)}
          />
          <Radio
            label="Aspect ratio"
            value={block.aspectRatio ?? "original"}
            options={[{ value: "original", label: "Original" }, { value: "16/9", label: "16:9" }, { value: "4/3", label: "4:3" }, { value: "1/1", label: "1:1" }, { value: "3/2", label: "3:2" }]}
            onChange={(v) => onChange({ aspectRatio: v } as Partial<Block>)}
          />
          {(block.aspectRatio ?? "original") !== "original" && (
            <Radio
              label="Object fit"
              value={block.objectFit ?? "cover"}
              options={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }]}
              onChange={(v) => onChange({ objectFit: v } as Partial<Block>)}
            />
          )}
          {(block.maxWidth ?? "full") !== "full" && (
            <Radio
              label="Alignment"
              value={block.align ?? "center"}
              options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]}
              onChange={(v) => onChange({ align: v } as Partial<Block>)}
            />
          )}
          <Toggle label="Rounded corners" checked={!!block.rounded} onChange={(v) => onChange({ rounded: v } as Partial<Block>)} />
          <Toggle
            label="Make image a link"
            checked={block.linkUrl !== undefined}
            onChange={(on) =>
              onChange({
                linkUrl: on ? (block.linkUrl ?? "") : undefined,
                linkOpensNewTab: on ? block.linkOpensNewTab : undefined,
              } as Partial<Block>)
            }
          />
          {block.linkUrl !== undefined && (
            <>
              <Field label="Link URL" value={block.linkUrl} onChange={(v) => onChange({ linkUrl: v } as Partial<Block>)} />
              <Toggle label="Open in new tab" checked={!!block.linkOpensNewTab} onChange={(v) => onChange({ linkOpensNewTab: v } as Partial<Block>)} />
            </>
          )}
          <Field label="Caption (optional)" value={block.caption ?? ""} onChange={(v) => onChange({ caption: v } as Partial<Block>)} />
          <p className="text-xs text-ink-soft">For a richer caption with formatting, use the “Image with Title Below” block instead.</p>
        </>
      );
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: still only the Task-12 thumbnail error; no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BlockFields.tsx
git commit -m "feat(admin): Image Only editor form with required alt validation"
```

---

## Task 12: Block picker thumbnail

**Files:**
- Modify: `src/components/admin/block-thumbnails/index.tsx`

- [ ] **Step 1: Add the thumbnail + map entry**

In `src/components/admin/block-thumbnails/index.tsx`, add the component after `ImageTitleBesideThumb` (line 89):

```tsx
const ImageOnlyThumb = () => (
  <Frame>
    <rect x="10" y="12" width="60" height="32" rx="2" fill={FILL} />
  </Frame>
);
```

Add to the `thumbnails` record (after `imageTitleBeside: ImageTitleBesideThumb,`, line 201):

```tsx
  imageOnly: ImageOnlyThumb,
```

- [ ] **Step 2: Verify types compile (the Task-9 error is now resolved)**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Run both logic test suites**

Run:
```bash
npx tsx tests/block-spacing.mjs
npx tsx tests/blocks-image-only.mjs
```
Expected: `block-spacing test PASSED` and `blocks-image-only test PASSED`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/block-thumbnails/index.tsx
git commit -m "feat(admin): Image Only block picker thumbnail"
```

---

## Task 13 (OPTIONAL polish): Canvas spacing guides on block cards

Editing aid only — dashed lines above/below a card proportional to its configured
spacing. Skippable without affecting functionality. Implement only if time allows.

**Files:**
- Modify: `src/components/admin/BlockCard.tsx`

- [ ] **Step 1: Render proportional guides**

In `BlockCard`, import the px map:

```tsx
import { spacingPxMap } from "@/lib/cms/spacing";
```

Compute capped guide heights below `const showSpacing = …`:

```tsx
  const guideTop = block.spaceAbove ? Math.min(24, spacingPxMap[block.spaceAbove] / 5) : 0;
  const guideBottom = block.spaceBelow ? Math.min(24, spacingPxMap[block.spaceBelow] / 5) : 0;
```

Wrap the card's outer return so a dashed guide renders above and below the existing
card `<div>` when `guideTop`/`guideBottom` > 0:

```tsx
  return (
    <div>
      {guideTop > 0 && (
        <div style={{ height: guideTop }} className="mx-auto w-2/3 border-t border-dashed border-line" aria-hidden="true" />
      )}
      {/* …existing card <div ref={setNodeRef} …> … </div>… */}
      {guideBottom > 0 && (
        <div style={{ height: guideBottom }} className="mx-auto w-2/3 border-b border-dashed border-line" aria-hidden="true" />
      )}
    </div>
  );
```

(Keep the existing sortable card `<div>` and its contents unchanged inside the new wrapper. The `setNodeRef`/`style`/`listeners` stay on the inner card div.)

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BlockCard.tsx
git commit -m "feat(admin): proportional spacing guides on block cards (editing aid)"
```

---

## Task 14: Final verification + manual QA

- [ ] **Step 1: Full type-check + both logic suites**

Run:
```bash
npx tsc --noEmit
npx tsx tests/block-spacing.mjs
npx tsx tests/blocks-image-only.mjs
```
Expected: tsc exit 0; both tests print `PASSED`.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual QA (dev server, `npm run dev`)**

Confirm and check off:
- [ ] An existing published page renders **identically** to before (no block opted into spacing).
- [ ] In the editor, the ↕ popover on a plain block (e.g. Rich text) changes its top/bottom gap; the change persists after autosave + reload.
- [ ] A banded block (Testimonials/Team) keeps its colored band's internal padding and only gains an external gap when spacing is set.
- [ ] Spacer and Divider cards show **no** ↕ button and no Spacing section in the panel.
- [ ] Set a page "Default spacing for new blocks", add a new block → it comes pre-set; existing blocks unchanged.
- [ ] Add an **Image Only** block: alt-text validation shows when empty; image renders for each aspect ratio (incl. Original) × max-width; alignment works when not full-width; link wrapping and caption render.

- [ ] **Step 5: Final commit (if any QA fixes were needed)**

```bash
git add -A
git commit -m "chore(cms): final QA fixes for block spacing + image-only"
```

---

## Self-review notes (addressed)
- **Spec coverage:** Part 2 data model (T1-2), opt-in renderer (T3-4), full-panel control (T6), quick popover (T7), page default + migration (T8), optional canvas aid (T13). Part 3 type/registry/preview (T9), component (T10), editor form (T11), picker thumbnail (T12). Part 1 (Edge) is explicitly out of scope.
- **Type consistency:** field names `spaceAbove`/`spaceBelow` and `flush` prop are used identically across `spacing.ts`, `blocks.ts`, `BlockRenderer`, every block component, `SpacingControls`, `BlockCard`, and `PageEditor`.
- **Known UX nuance:** an unset spacing control displays "None" highlighted; selecting any value (including "None") opts the block in. Documented in `SpacingControls`.
