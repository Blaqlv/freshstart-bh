# Design — Per-Block Spacing (opt-in) + Image-Only Block

**Date:** 2026-06-30
**Branch:** `feat/block-spacing-and-image-only`
**Source:** External "Prompt 11" (Parts 2 & 3). Part 1 (Edge crash) is deferred — see note below.

## Context & architecture reality

This repo does **not** match the architecture the source prompt assumes. The prompt
assumes a relational `ContentBlock` Prisma model, a `BlockType` enum, per-block
`prisma migrate`, per-block REST `PATCH`, `next/image`, and an `apps/cms` + `apps/web`
split. None of that is true here. The real architecture:

- **Blocks are JSON.** A page version stores an ordered `Block[]` on
  `PageVersion.blocks` (a `Json` column). `Block` is a discriminated TypeScript union
  in `src/lib/cms/blocks.ts`, keyed by lowercase `type` strings (`"hero"`,
  `"columnLayout"`, …). There is no `ContentBlock` table and no `BlockType` enum.
- **Rendering** is a single server component, `src/components/cms/BlockRenderer.tsx`,
  with a `switch (block.type)`. Some cases render inline; others delegate to
  components in `src/components/cms/blocks/`.
- **Images** render with a plain `<img>` (see `ImageTitleBelowBlock.tsx`). There is no
  `next/image` remote config.
- **Editing** is whole-page state + Server Action autosave. `PageEditor` (client)
  holds every block in React state, serializes to a hidden `blocks` input, and saves
  via `autosavePage` / `savePage` / `publishPage`. There is **no per-block PATCH
  endpoint**; block edits mutate `items` state and ride the existing autosave.

All work below is translated onto that reality.

### Part 1 deferral

The Edge crash (prompt Part 1) is deferred. A screenshot confirms the app's
`error.tsx` boundary **is firing** on the public site (so a component throws during
render), and the cookie-consent `localStorage` — the prompt's predicted culprit — is
**already guarded** (`typeof window` + try/catch in `src/lib/consent.ts`), and its
banner renders fine in the failing screenshot. The true root cause needs the actual
Edge console error/stack, which we don't yet have. No fabricated bug report will be
written. Resume when the console output is available.

## Goals

1. Give admins opt-in control of vertical spacing above/below any block, **without
   changing how any existing live page renders** until they opt a block in.
2. Add a minimal **Image-Only** block (single `<img>`, optional link + caption).

## Non-goals

- No global re-flow of existing pages (explicitly rejected "Option B / global reset").
- No new REST endpoints; reuse whole-page autosave.
- No `next/image` migration.
- Part 1 / Edge work.

---

## Part 2 — Opt-in per-block vertical spacing

### Data model

`src/lib/cms/spacing.ts` (new):

```ts
export type BlockSpacing = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
export const spacingPxMap: Record<BlockSpacing, number> = {
  none: 0, xs: 8, sm: 16, md: 32, lg: 56, xl: 80, xxl: 120,
};
export const spacingLabelMap: Record<BlockSpacing, string> = {
  none: "None", xs: "XS (8px)", sm: "Small (16px)", md: "Medium (32px)",
  lg: "Large (56px)", xl: "XL (80px)", xxl: "XXL (120px)",
};
export function spacingToPx(value: BlockSpacing | undefined): number {
  return value ? spacingPxMap[value] : 0;
}
```

`src/lib/cms/blocks.ts` — extend the shared intersection on the `Block` union (today
`& { isVisible?: boolean }`) to:

```ts
& { isVisible?: boolean; spaceAbove?: BlockSpacing; spaceBelow?: BlockSpacing }
```

> **Field names:** `spaceAbove`/`spaceBelow`, NOT `spacingTop`/`spacingBottom`.
> `horizontalDivider` already declares `spacingTop`/`spacingBottom` with different
> semantics, so reusing those names on the shared intersection would collide.

Both fields are **optional**. Undefined = "legacy", i.e. render as today. No JSON
migration is required — `parseBlocks` already tolerates extra fields; existing blocks
simply lack these keys.

### Rendering — the opt-in rule

`BlockRenderer` wraps each block in a `<div data-block-id … >`. Blocks fall into two
classes:

(Throughout, the per-block fields are `spaceAbove` / `spaceBelow`.)

- **Plain blocks**: `richText`, `faqAccordion`, `serviceGrid`, `locationGrid`,
  `numberedList`, `iconList`, `imageLeftTextRight`, `imageRightTextLeft`,
  `imageTitleBelow`, `imageTitleBeside`, `richTextColumns`, `columnLayout`,
  `imageOnly`.
  - No spacing set → render unchanged (component keeps its built-in `py-12` / `py-8`).
  - Spacing set (either side) → component renders **flush** (built-in outer vertical
    padding suppressed) and the wrapper supplies `paddingTop`/`paddingBottom`. A side
    left unset while the other is set falls back to the block's legacy px for that
    side, so a half-configured block never collapses.
- **Banded blocks** (own a colored background): `hero`, `ctaBanner`,
  `testimonialCarousel`, `teamGrid`.
  - The band **always keeps its internal padding** (never flush) — moving it outward
    would collapse the colored band against its content.
  - The wrapper adds an **external** gap only when spacing is set (default 0 = today).

"Flush" suppression mechanism: plain block components that currently hardcode outer
vertical padding take an optional `flush?: boolean` prop (or, for inline `switch`
cases, a conditional class) that swaps their outer `py-*` for `py-0`. Internal spacing
inside a block (gaps between items, `mt-*` on headings) is untouched.

`verticalSpacer` and `horizontalDivider` are unaffected: they own purpose-built
spacing config already, and they are not given wrapper spacing by default (treated as
"banded" w.r.t. the wrapper: external default 0).

### Editor — two entry points

Both write into the existing `items` React state and ride autosave; no new endpoint.

1. **Full panel**: a collapsible **"Spacing"** section appended to the *shared*
   `BlockEditorPanel` chrome (below the type-specific fields). Two segmented controls
   — Space Above / Space Below — over `none … xxl`, each with a live px readout. Added
   once in the shared panel, not per block type.
2. **Quick popover**: a `↕` button on each `BlockCard` action row opens a small
   anchored popover with the same two segmented controls. Selecting a value updates
   `block.spacingTop` / `spacingBottom` in `items` state immediately (autosave picks
   it up on its normal cadence / on next change).
3. **Canvas aid (optional, nice-to-have)**: thin dashed guides above/below a card with
   height proportional to its configured spacing, so the page rhythm is visible while
   editing. Editing aid only — never rendered on the public site.

### Page-level default

Add `defaultBlockSpacing String?` (nullable) to the `Page` model. Surfaced in the
Page settings area of `PageEditor` as one segmented control. Used **only** to pre-set
`spacingTop` / `spacingBottom` on **newly added** blocks for that page (in
`handlePick`). It does not retroactively touch existing blocks, and any block can be
overridden afterward. When null, new blocks get no spacing (legacy).

**Migration:** this is the only schema change. It requires
`prisma migrate dev --name page-default-block-spacing` locally and, per this project's
deploy mechanics, a **manual migration apply against prod** (Vercel build does not run
migrations). Field is nullable so it is a no-op until set.

---

## Part 3 — Image-Only block (additive)

### Type

`src/lib/cms/blocks.ts`:

```ts
export type ImageOnlyBlock = {
  type: "imageOnly";
  image: { url: string; alt: string }; // alt required (enforced in editor)
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

Add `"imageOnly"` to the `BlockType` union and `ImageOnlyBlock` to the `Block` union,
plus a `blockRegistry` entry (category `"images"`).

### Component

`src/components/cms/blocks/ImageOnlyBlock.tsx`, server component, matching repo
conventions — **plain `<img>`** (not `next/image`), `Container`, Tailwind aspect/
max-width maps mirroring `ImageTitleBelowBlock`. `aspectRatio: "original"` → natural
ratio, no crop. Optional `<a>` wrapper for `linkUrl` (`rel="noopener noreferrer"` +
`target="_blank"` when new tab). Optional `<figcaption>` for `caption`. Wrapped in a
`<figure>`.

Register in the `BlockRenderer` switch.

### Editor form

Add an `imageOnly` case to `BlockFields`: MediaPicker for image; **required** alt-text
input with inline validation ("Alt text is required for accessibility."); segmented
controls for Max Width / Aspect Ratio / Object Fit (disabled when aspect = original) /
Alignment (disabled when max width = full); Rounded toggle; "Make image a link" toggle
revealing Link URL + new-tab toggle; plain-text Caption with helper text pointing to
`imageTitleBelow` for rich captions.

### Picker

Add an entry under the **Images** group in `BlockPicker` with a thumbnail in
`block-thumbnails` (a single centered filled rectangle, no text lines — distinct from
`imageTitleBelow`).

---

## Testing

- **`spacing.ts`**: unit tests for `spacingPxMap` / `spacingLabelMap` completeness and
  `spacingToPx` (incl. `undefined → 0`).
- **`parseBlocks`**: tolerates blocks carrying `spacingTop` / `spacingBottom`.
- **Renderer rule**: a plain block with no spacing keeps `py-12`; with spacing set it
  goes flush and the wrapper carries the px; a banded block keeps internal padding and
  only gains an external gap when spacing is set.
- **Image-Only**: renders across aspectRatio (incl. `original`) × maxWidth
  combinations; link wrapping; caption present/absent; missing `url` renders nothing
  harmful.

## Risks / call-outs

- The `flush` prop touches every plain block component + the inline `switch` cases —
  mechanical but broad. Mitigated by the opt-in default (untouched render path when no
  spacing is set).
- `columnLayout` nests child blocks that now also pass through the wrapper; verify
  nested children don't double up spacing.
- `Page.defaultBlockSpacing` migration must be applied to prod manually.

## Out of scope

Part 1 (Edge crash), any global spacing reset, `next/image` adoption, new REST
endpoints.
