# Phase A — Page Templates & New Content Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a CMS `Page` declare a template (`SERVICE_DETAIL` / `GENERAL`) with an optional sidebar, add 7 new content block types, and render pages through the correct template shell.

**Architecture:** Adapt to the existing CMS — blocks stay as a JSON array in `PageVersion.blocks` (no new `ContentBlock` table). Two enum fields are added to `Page`. New block types extend the existing `blockRegistry` in `src/lib/cms/blocks.ts`; each renders via a focused component under `src/components/cms/blocks/`, dispatched from `BlockRenderer`. Two template shells (`ServiceDetailTemplate`, `GeneralTemplate`) wrap the renderer and a shared `ServiceSidebar`; the catch-all route picks the shell by `page.template`.

**Tech Stack:** Next.js 16 (App Router, RSC, async params), React 19, Prisma 6 + Neon Postgres, Tailwind v4, `lucide-react` (new).

**Testing note:** This repo has **no unit-test runner** (only `npm run lint`, `npm run build`, and a Playwright a11y scan). Per-task verification is `npx tsc --noEmit` (type/contract check) and, for the final task, `npm run build` + `npm run lint` + a manual render check. Do not introduce a unit-test framework — it is out of scope and not how this codebase works.

**Conventions to follow (observed in the codebase):**
- Path alias `@/*` → `./src/*`. DB client: `import { db } from "@/lib/db"`.
- UI primitives: `Container` (`@/components/ui/Container`), `Button` (`@/components/ui/Button`, `variant?: "primary"|"secondary"|"white"`, `href` required).
- Brand Tailwind tokens in use: `brand-dark`, `brand-hover`, `brand-tint`, `brand`, `accent`, `ink`, `ink-soft`, `line`, `surface-alt`, `gold`, `rounded-card`.
- Block render components are server components; bodies render as plain paragraphs via `body.split(/\n\s*\n/)` (no HTML/sanitization in Phase A).
- Branch for this work already exists: `prompt-6-phase-a-templates`. Commit per task.

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `prisma/schema.prisma` | Add `PageTemplate` enum + `template`/`hasSidebar` on `Page` | Modify |
| `package.json` | Add `lucide-react` dependency | Modify (via npm) |
| `src/lib/cms/blocks.ts` | 7 new block types + registry entries | Modify |
| `src/lib/cms/resolveIcon.ts` | Lucide icon name → component, safe fallback | Create |
| `src/components/cms/blocks/Paragraphs.tsx` | Shared plain-text → paragraphs helper | Create |
| `src/components/cms/blocks/NumberedListBlock.tsx` | `numberedList` renderer | Create |
| `src/components/cms/blocks/IconListBlock.tsx` | `iconList` renderer | Create |
| `src/components/cms/blocks/RichTextColumnsBlock.tsx` | `richTextColumns` renderer | Create |
| `src/components/cms/blocks/ImageTextSplitBlock.tsx` | shared `imageLeftTextRight`/`imageRightTextLeft` renderer | Create |
| `src/components/cms/blocks/ImageTitleBelowBlock.tsx` | `imageTitleBelow` renderer | Create |
| `src/components/cms/blocks/ImageTitleBesideBlock.tsx` | `imageTitleBeside` renderer | Create |
| `src/components/cms/BlockRenderer.tsx` | Dispatch new block types | Modify |
| `src/components/cms/ServiceSidebar.tsx` | Static sidebar (CTAs, phone, insurance, related) | Create |
| `src/components/templates/ServiceDetailTemplate.tsx` | Sidebar + canvas + pinned form | Create |
| `src/components/templates/GeneralTemplate.tsx` | Full-width or sidebar by `hasSidebar` | Create |
| `src/app/(site)/[...slug]/page.tsx` | Dispatch to template by `page.template` | Modify |

**Known limitation (document, don't fix in Phase A):** each block component renders its own `<section><Container>`. Inside the sidebar grid column this produces a slight double-container inset. Acceptable for the foundation; the container strategy is revisited in Phase C when block editor forms land.

---

## Task 1: Schema — PageTemplate enum + Page fields + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum and fields**

Add this enum near the other enums (e.g. after `ContentStatus`):

```prisma
enum PageTemplate {
  SERVICE_DETAIL
  GENERAL
}
```

In `model Page`, add these two fields (place them after `ogImageUrl`):

```prisma
  template         PageTemplate  @default(GENERAL)
  hasSidebar       Boolean       @default(false) // GENERAL only; SERVICE_DETAIL renders the sidebar regardless
```

- [ ] **Step 2: Regenerate the Prisma client (no DB needed — updates TS types)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success message.

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: "The schema at prisma\schema.prisma is valid 🚀"

- [ ] **Step 4: Create and apply the migration**

Run: `npx prisma migrate dev --name page-templates`
Expected: a new folder under `prisma/migrations/<timestamp>_page-templates/` and "Your database is now in sync with your schema."

> If `DATABASE_URL` is not reachable in this environment, skip Step 4, leave Steps 1–3 done (types are generated from the schema), and note that the migration must be run where the DB is reachable. Do not block later tasks — they only need the generated types.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "$(cat <<'EOF'
Add PageTemplate enum and template/hasSidebar fields to Page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add lucide-react dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

Run: `npm install lucide-react`
Expected: `lucide-react` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Verify the import resolves**

Run: `node -e "require('lucide-react'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add lucide-react for icon-list block icons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Define the 7 new block types

**Files:**
- Modify: `src/lib/cms/blocks.ts`

- [ ] **Step 1: Extend the `BlockType` union**

Replace the existing `BlockType` union with:

```ts
export type BlockType =
  | "hero"
  | "richText"
  | "faqAccordion"
  | "serviceGrid"
  | "testimonialCarousel"
  | "locationGrid"
  | "teamGrid"
  | "ctaBanner"
  | "numberedList"
  | "iconList"
  | "richTextColumns"
  | "imageLeftTextRight"
  | "imageRightTextLeft"
  | "imageTitleBelow"
  | "imageTitleBeside";
```

- [ ] **Step 2: Add the new block type definitions**

Add these types after the existing `CtaBannerBlock` type (before the `Block` union):

```ts
export type NumberedListBlock = {
  type: "numberedList";
  title?: string;
  intro?: string;
  items: { heading: string; body?: string }[];
  numberStyle?: "circle" | "square" | "plain";
  columns?: 1 | 2;
};

export type IconListBlock = {
  type: "iconList";
  title?: string;
  intro?: string;
  items: { icon: string; label: string; body?: string }[];
  iconColor?: string;
  columns?: 1 | 2 | 3;
};

export type RichTextColumnsBlock = {
  type: "richTextColumns";
  heading?: string;
  intro?: string;
  columns: { title?: string; body: string }[];
  dividers?: boolean;
};

/** Shared fields for the two image/text split blocks. */
export type ImageTextSplitFields = {
  image: { url: string; alt: string };
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageWidthPercent?: 40 | 45 | 50;
};
export type ImageLeftTextRightBlock = ImageTextSplitFields & { type: "imageLeftTextRight" };
export type ImageRightTextLeftBlock = ImageTextSplitFields & { type: "imageRightTextLeft" };

export type ImageTitleBelowBlock = {
  type: "imageTitleBelow";
  image: { url: string; alt: string };
  title: string;
  caption?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "3/2";
  maxWidth?: "sm" | "md" | "lg" | "full";
};

export type ImageTitleBesideBlock = {
  type: "imageTitleBeside";
  image: { url: string; alt: string };
  imagePosition: "left" | "right";
  title: string;
  body: string;
  imageSize?: "sm" | "md" | "lg";
  verticalAlign?: "top" | "center";
};
```

- [ ] **Step 3: Extend the `Block` union**

Replace the existing `Block` union with:

```ts
export type Block =
  | HeroBlock
  | RichTextBlock
  | FaqAccordionBlock
  | ServiceGridBlock
  | TestimonialCarouselBlock
  | LocationGridBlock
  | TeamGridBlock
  | CtaBannerBlock
  | NumberedListBlock
  | IconListBlock
  | RichTextColumnsBlock
  | ImageLeftTextRightBlock
  | ImageRightTextLeftBlock
  | ImageTitleBelowBlock
  | ImageTitleBesideBlock;
```

- [ ] **Step 4: Add registry entries with defaults**

Add these objects to the end of the `blockRegistry` array (after the `ctaBanner` entry):

```ts
  {
    type: "numberedList",
    label: "Numbered list",
    description: "Numbered steps or items, each with a heading and optional text.",
    create: () => ({
      type: "numberedList",
      title: "How it works",
      numberStyle: "circle",
      columns: 1,
      items: [{ heading: "First step", body: "" }],
    }),
  },
  {
    type: "iconList",
    label: "Icon list",
    description: "Items with a Lucide icon, label, and optional text.",
    create: () => ({
      type: "iconList",
      title: "Why choose us",
      columns: 2,
      items: [{ icon: "CheckCircle2", label: "Benefit", body: "" }],
    }),
  },
  {
    type: "richTextColumns",
    label: "Text columns",
    description: "Two to four columns of text with an optional intro.",
    create: () => ({
      type: "richTextColumns",
      heading: "",
      dividers: false,
      columns: [
        { title: "", body: "Column one." },
        { title: "", body: "Column two." },
      ],
    }),
  },
  {
    type: "imageLeftTextRight",
    label: "Image left, text right",
    description: "Image on the left, heading and text on the right.",
    create: () => ({
      type: "imageLeftTextRight",
      image: { url: "", alt: "" },
      title: "Heading",
      body: "Add your content here.",
      imageWidthPercent: 50,
    }),
  },
  {
    type: "imageRightTextLeft",
    label: "Image right, text left",
    description: "Image on the right, heading and text on the left.",
    create: () => ({
      type: "imageRightTextLeft",
      image: { url: "", alt: "" },
      title: "Heading",
      body: "Add your content here.",
      imageWidthPercent: 50,
    }),
  },
  {
    type: "imageTitleBelow",
    label: "Image with title below",
    description: "A single image with a title and optional caption underneath.",
    create: () => ({
      type: "imageTitleBelow",
      image: { url: "", alt: "" },
      title: "Caption title",
      aspectRatio: "16/9",
      maxWidth: "lg",
    }),
  },
  {
    type: "imageTitleBeside",
    label: "Image with title beside",
    description: "Image on one side with a title and text beside it.",
    create: () => ({
      type: "imageTitleBeside",
      image: { url: "", alt: "" },
      imagePosition: "left",
      title: "Heading",
      body: "Add your content here.",
      imageSize: "md",
      verticalAlign: "top",
    }),
  },
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors (PASS — exit code 0).

- [ ] **Step 6: Commit**

```bash
git add src/lib/cms/blocks.ts
git commit -m "$(cat <<'EOF'
Add 7 new content block type definitions and registry entries

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Icon resolver

**Files:**
- Create: `src/lib/cms/resolveIcon.ts`

- [ ] **Step 1: Write the resolver**

```ts
import * as icons from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Resolve a Lucide icon by its export name (e.g. "CheckCircle2").
 * Falls back to `Circle` for unknown or empty names so render never crashes.
 */
export function resolveIcon(name: string): IconComponent {
  const map = icons as unknown as Record<string, IconComponent>;
  return map[name] ?? icons.Circle;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cms/resolveIcon.ts
git commit -m "$(cat <<'EOF'
Add safe Lucide icon resolver for the icon-list block

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Shared paragraphs helper

**Files:**
- Create: `src/components/cms/blocks/Paragraphs.tsx`

- [ ] **Step 1: Write the helper**

```tsx
/**
 * Renders plain-text content as paragraphs, splitting on blank lines.
 * Phase A: bodies are plain text (no HTML). Phase B replaces this with
 * sanitized TinyMCE HTML — block field shapes stay the same.
 */
export function Paragraphs({
  text,
  className = "space-y-4 text-ink-soft",
}: {
  text?: string;
  className?: string;
}) {
  if (!text || !text.trim()) return null;
  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/Paragraphs.tsx
git commit -m "$(cat <<'EOF'
Add shared Paragraphs helper for plain-text block bodies

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: NumberedListBlock

**Files:**
- Create: `src/components/cms/blocks/NumberedListBlock.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import type { NumberedListBlock as NumberedListBlockType } from "@/lib/cms/blocks";

const shapeClass = { circle: "rounded-full", square: "rounded-md" } as const;

export function NumberedListBlock({ block }: { block: NumberedListBlockType }) {
  const style = block.numberStyle ?? "circle";
  const cols = block.columns === 2 ? "sm:grid-cols-2" : "grid-cols-1";
  return (
    <section className="py-12">
      <Container className="max-w-4xl">
        {block.title && <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>}
        {block.intro && (
          <Paragraphs text={block.intro} className="mt-3 space-y-4 text-ink-soft" />
        )}
        <ol className={`mt-6 grid gap-6 ${cols}`}>
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-4">
              <span
                aria-hidden
                className={
                  style === "plain"
                    ? "shrink-0 text-2xl font-bold text-brand-dark"
                    : `flex h-10 w-10 shrink-0 items-center justify-center bg-brand-dark font-bold text-white ${shapeClass[style]}`
                }
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-brand-dark">{item.heading}</h3>
                {item.body && (
                  <Paragraphs text={item.body} className="mt-1 space-y-2 text-sm text-ink-soft" />
                )}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/NumberedListBlock.tsx
git commit -m "$(cat <<'EOF'
Add NumberedListBlock renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: IconListBlock

**Files:**
- Create: `src/components/cms/blocks/IconListBlock.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import { resolveIcon } from "@/lib/cms/resolveIcon";
import type { IconListBlock as IconListBlockType } from "@/lib/cms/blocks";

const colClass = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
} as const;

export function IconListBlock({ block }: { block: IconListBlockType }) {
  const cols = colClass[block.columns ?? 1];
  return (
    <section className="py-12">
      <Container>
        {block.title && <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>}
        {block.intro && (
          <Paragraphs text={block.intro} className="mt-3 space-y-4 text-ink-soft" />
        )}
        <ul className={`mt-6 grid gap-6 ${cols}`}>
          {block.items.map((item, i) => {
            const Icon = resolveIcon(item.icon);
            return (
              <li key={i} className="flex gap-3">
                <Icon
                  aria-hidden
                  className={`mt-0.5 h-6 w-6 shrink-0 ${block.iconColor ? "" : "text-brand-dark"}`}
                  style={block.iconColor ? { color: block.iconColor } : undefined}
                />
                <div>
                  <h3 className="font-semibold text-brand-dark">{item.label}</h3>
                  {item.body && (
                    <Paragraphs text={item.body} className="mt-1 space-y-2 text-sm text-ink-soft" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/IconListBlock.tsx
git commit -m "$(cat <<'EOF'
Add IconListBlock renderer with Lucide icons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: RichTextColumnsBlock

**Files:**
- Create: `src/components/cms/blocks/RichTextColumnsBlock.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import type { RichTextColumnsBlock as RichTextColumnsBlockType } from "@/lib/cms/blocks";

const gridByCount: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

export function RichTextColumnsBlock({ block }: { block: RichTextColumnsBlockType }) {
  const grid = gridByCount[block.columns.length] ?? "md:grid-cols-2";
  return (
    <section className="py-12">
      <Container>
        {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
        {block.intro && (
          <Paragraphs text={block.intro} className="mt-3 max-w-3xl space-y-4 text-ink-soft" />
        )}
        <div className={`mt-6 grid grid-cols-1 gap-8 ${grid}`}>
          {block.columns.map((col, i) => (
            <div
              key={i}
              className={block.dividers && i > 0 ? "md:border-l md:border-line md:pl-8" : ""}
            >
              {col.title && <h3 className="font-semibold text-brand-dark">{col.title}</h3>}
              <Paragraphs text={col.body} className="mt-2 space-y-3 text-ink-soft" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/RichTextColumnsBlock.tsx
git commit -m "$(cat <<'EOF'
Add RichTextColumnsBlock renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: ImageTextSplitBlock (shared left/right)

**Files:**
- Create: `src/components/cms/blocks/ImageTextSplitBlock.tsx`

- [ ] **Step 1: Write the component**

Plain `<img>` is used deliberately: the CMS image host is not configured in `next.config.ts` `images.remotePatterns`, so `next/image` would error on remote URLs. Static class maps are used (Tailwind cannot compile arbitrary values from dynamic template strings).

```tsx
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Paragraphs } from "./Paragraphs";
import type { ImageTextSplitFields } from "@/lib/cms/blocks";

const gridClass: Record<"left" | "right", Record<number, string>> = {
  left: {
    40: "md:grid-cols-[40%_1fr]",
    45: "md:grid-cols-[45%_1fr]",
    50: "md:grid-cols-[50%_1fr]",
  },
  right: {
    40: "md:grid-cols-[1fr_40%]",
    45: "md:grid-cols-[1fr_45%]",
    50: "md:grid-cols-[1fr_50%]",
  },
};

export function ImageTextSplitBlock({
  block,
  imageSide,
}: {
  block: ImageTextSplitFields;
  imageSide: "left" | "right";
}) {
  const isRight = imageSide === "right";
  const grid = gridClass[imageSide][block.imageWidthPercent ?? 50];
  return (
    <section className="py-12">
      <Container className={`grid grid-cols-1 items-center gap-8 ${grid}`}>
        {/* DOM order keeps image above text on mobile; md:order swaps for desktop. */}
        <div className={isRight ? "md:order-2" : ""}>
          {block.image.url && (
            <img
              src={block.image.url}
              alt={block.image.alt}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-card object-cover"
            />
          )}
        </div>
        <div className={isRight ? "md:order-1" : ""}>
          <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>
          <Paragraphs text={block.body} className="mt-3 space-y-4 text-ink-soft" />
          {block.ctaLabel && block.ctaHref && (
            <div className="mt-5">
              <Button href={block.ctaHref}>{block.ctaLabel}</Button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/ImageTextSplitBlock.tsx
git commit -m "$(cat <<'EOF'
Add shared ImageTextSplitBlock renderer for left/right image splits

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: ImageTitleBelowBlock

**Files:**
- Create: `src/components/cms/blocks/ImageTitleBelowBlock.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import type { ImageTitleBelowBlock as ImageTitleBelowBlockType } from "@/lib/cms/blocks";

const aspectClass: Record<string, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
};

const maxWidthClass: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  full: "max-w-none",
};

export function ImageTitleBelowBlock({ block }: { block: ImageTitleBelowBlockType }) {
  return (
    <section className="py-12">
      <Container className={maxWidthClass[block.maxWidth ?? "lg"]}>
        {block.image.url && (
          <img
            src={block.image.url}
            alt={block.image.alt}
            loading="lazy"
            className={`w-full rounded-card object-cover ${aspectClass[block.aspectRatio ?? "16/9"]}`}
          />
        )}
        <h2 className="mt-4 text-2xl font-bold text-brand-dark">{block.title}</h2>
        {block.caption && (
          <Paragraphs text={block.caption} className="mt-2 space-y-2 text-ink-soft" />
        )}
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/ImageTitleBelowBlock.tsx
git commit -m "$(cat <<'EOF'
Add ImageTitleBelowBlock renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: ImageTitleBesideBlock

**Files:**
- Create: `src/components/cms/blocks/ImageTitleBesideBlock.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import type { ImageTitleBesideBlock as ImageTitleBesideBlockType } from "@/lib/cms/blocks";

const sizeClass: Record<"left" | "right", Record<string, string>> = {
  left: {
    sm: "md:grid-cols-[30%_1fr]",
    md: "md:grid-cols-[40%_1fr]",
    lg: "md:grid-cols-[50%_1fr]",
  },
  right: {
    sm: "md:grid-cols-[1fr_30%]",
    md: "md:grid-cols-[1fr_40%]",
    lg: "md:grid-cols-[1fr_50%]",
  },
};

export function ImageTitleBesideBlock({ block }: { block: ImageTitleBesideBlockType }) {
  const isRight = block.imagePosition === "right";
  const grid = sizeClass[block.imagePosition][block.imageSize ?? "md"];
  const align = block.verticalAlign === "center" ? "md:items-center" : "md:items-start";
  return (
    <section className="py-12">
      <Container className={`grid grid-cols-1 gap-8 ${align} ${grid}`}>
        <div className={isRight ? "md:order-2" : ""}>
          {block.image.url && (
            <img
              src={block.image.url}
              alt={block.image.alt}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-card object-cover"
            />
          )}
        </div>
        <div className={isRight ? "md:order-1" : ""}>
          <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>
          <Paragraphs text={block.body} className="mt-3 space-y-4 text-ink-soft" />
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/blocks/ImageTitleBesideBlock.tsx
git commit -m "$(cat <<'EOF'
Add ImageTitleBesideBlock renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Dispatch new blocks from BlockRenderer

**Files:**
- Modify: `src/components/cms/BlockRenderer.tsx`

- [ ] **Step 1: Add imports**

After the existing imports at the top of the file, add:

```tsx
import { NumberedListBlock } from "./blocks/NumberedListBlock";
import { IconListBlock } from "./blocks/IconListBlock";
import { RichTextColumnsBlock } from "./blocks/RichTextColumnsBlock";
import { ImageTextSplitBlock } from "./blocks/ImageTextSplitBlock";
import { ImageTitleBelowBlock } from "./blocks/ImageTitleBelowBlock";
import { ImageTitleBesideBlock } from "./blocks/ImageTitleBesideBlock";
```

- [ ] **Step 2: Add the new cases**

In the `switch (block.type)` inside `BlockView`, add these cases immediately before the `default:` case:

```tsx
    case "numberedList":
      return <NumberedListBlock block={block} />;

    case "iconList":
      return <IconListBlock block={block} />;

    case "richTextColumns":
      return <RichTextColumnsBlock block={block} />;

    case "imageLeftTextRight":
      return <ImageTextSplitBlock block={block} imageSide="left" />;

    case "imageRightTextLeft":
      return <ImageTextSplitBlock block={block} imageSide="right" />;

    case "imageTitleBelow":
      return <ImageTitleBelowBlock block={block} />;

    case "imageTitleBeside":
      return <ImageTitleBesideBlock block={block} />;
```

- [ ] **Step 3: Verify it compiles (this also proves the discriminated union narrows correctly)**

Run: `npx tsc --noEmit`
Expected: no errors. (If `block` does not narrow to the expected type in a case, tsc fails here.)

- [ ] **Step 4: Commit**

```bash
git add src/components/cms/BlockRenderer.tsx
git commit -m "$(cat <<'EOF'
Dispatch 7 new block types from BlockRenderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: ServiceSidebar

**Files:**
- Create: `src/components/cms/ServiceSidebar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { acceptedInsurance, site } from "@/lib/site";

/**
 * Static service-style sidebar: contact CTAs, phone, accepted insurance, and up
 * to three related services. Static content is sourced from src/lib/site.ts (the
 * in-sync source of truth) rather than hardcoded. Related services are derived
 * (3 other published Service records); there is no relatedServiceIds field.
 */
export async function ServiceSidebar({ currentSlug }: { currentSlug?: string }) {
  const related = await db.service.findMany({
    where: { status: "PUBLISHED", ...(currentSlug ? { slug: { not: currentSlug } } : {}) },
    orderBy: { order: "asc" },
    take: 3,
  });

  return (
    <aside className="space-y-6">
      <div className="rounded-card border border-line bg-surface-alt p-6">
        <h2 className="font-semibold text-brand-dark">Ready to Get Started?</h2>
        <p className="mt-2 text-sm text-ink-soft">{site.sameDayNote}</p>
        <a
          href={site.phoneHref}
          className="mt-3 block text-2xl font-bold text-brand-dark hover:underline"
        >
          {site.phone}
        </a>
        <div className="mt-4 flex flex-col gap-2">
          <Button href="/intake">Book an Assessment</Button>
          <Button href="#contact-form" variant="secondary">
            Request Information
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-line p-6">
        <h2 className="font-semibold text-brand-dark">Insurance accepted</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          {acceptedInsurance.slice(0, 8).map((name) => (
            <li key={name} className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 text-brand-dark">
                ✓
              </span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/insurance"
          className="mt-3 inline-block text-sm font-semibold text-brand-dark hover:underline"
        >
          See all accepted insurance →
        </Link>
      </div>

      {related.length > 0 && (
        <div className="rounded-card border border-line p-6">
          <h2 className="font-semibold text-brand-dark">Related services</h2>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/services/${r.slug}`}
                  className="font-medium text-brand-dark hover:underline"
                >
                  {r.title}
                </Link>
                {r.summary && <p className="mt-0.5 text-sm text-ink-soft">{r.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/cms/ServiceSidebar.tsx
git commit -m "$(cat <<'EOF'
Add ServiceSidebar (CTAs, phone, insurance, related services)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: ServiceDetailTemplate

**Files:**
- Create: `src/components/templates/ServiceDetailTemplate.tsx`

- [ ] **Step 1: Write the component**

`AppointmentForm` is the existing form component (the prompt's `AppointmentRequestForm` does not exist). It is a client component taking `locations`/`services` option arrays and an optional `defaultService`.

```tsx
import type { Page } from "@prisma/client";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ServiceSidebar } from "@/components/cms/ServiceSidebar";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import type { Block } from "@/lib/cms/blocks";

/**
 * SERVICE_DETAIL layout: editable block canvas + static sidebar, with the
 * appointment form always pinned below the blocks (anchored #contact-form so the
 * sidebar "Request Information" link scrolls to it).
 */
export async function ServiceDetailTemplate({
  page,
  blocks,
}: {
  page: Page;
  blocks: Block[];
}) {
  const [locations, services] = await Promise.all([
    db.location.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    db.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
      <div>
        <BlockRenderer blocks={blocks} />
        <section id="contact-form" className="pt-12">
          <h2 className="text-2xl font-bold text-brand-dark">Request an appointment</h2>
          <div className="mt-6 max-w-2xl">
            <AppointmentForm
              locations={locations.map((l) => ({ value: l.slug, label: l.name }))}
              services={services.map((s) => ({ value: s.slug, label: s.title }))}
              defaultService={page.slug}
            />
          </div>
        </section>
      </div>
      <ServiceSidebar currentSlug={page.slug} />
    </Container>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/ServiceDetailTemplate.tsx
git commit -m "$(cat <<'EOF'
Add ServiceDetailTemplate (block canvas + sidebar + pinned form)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: GeneralTemplate

**Files:**
- Create: `src/components/templates/GeneralTemplate.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { Page } from "@prisma/client";
import { Container } from "@/components/ui/Container";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ServiceSidebar } from "@/components/cms/ServiceSidebar";
import type { Block } from "@/lib/cms/blocks";

/**
 * GENERAL layout. Full-width block canvas by default; when page.hasSidebar is
 * true, the same two-column layout as SERVICE_DETAIL (no pinned form).
 */
export function GeneralTemplate({ page, blocks }: { page: Page; blocks: Block[] }) {
  if (!page.hasSidebar) {
    return <BlockRenderer blocks={blocks} />;
  }
  return (
    <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
      <div>
        <BlockRenderer blocks={blocks} />
      </div>
      <ServiceSidebar />
    </Container>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/GeneralTemplate.tsx
git commit -m "$(cat <<'EOF'
Add GeneralTemplate with optional sidebar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Dispatch templates from the catch-all route

**Files:**
- Modify: `src/app/(site)/[...slug]/page.tsx`

- [ ] **Step 1: Add template imports**

After the existing `import { BlockRenderer } ...` line, add:

```tsx
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { GeneralTemplate } from "@/components/templates/GeneralTemplate";
```

- [ ] **Step 2: Replace the render return**

Replace this existing block at the end of `CmsPage`:

```tsx
  const blocks = parseBlocks(version?.blocks);

  return <BlockRenderer blocks={blocks} />;
```

with:

```tsx
  const blocks = parseBlocks(version?.blocks);

  if (page.template === "SERVICE_DETAIL") {
    return <ServiceDetailTemplate page={page} blocks={blocks} />;
  }
  return <GeneralTemplate page={page} blocks={blocks} />;
```

(`BlockRenderer` is still imported/used transitively by the templates, but the direct import in this file becomes unused — remove the now-unused `import { BlockRenderer } ...` line to satisfy lint.)

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/[...slug]/page.tsx"
git commit -m "$(cat <<'EOF'
Dispatch CMS pages to template shell by page.template

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Full build, lint, and manual render verification

**Files:** none modified (verification + throwaway seed script).

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build completes successfully (no type or build errors).

- [ ] **Step 3: Seed a demo SERVICE_DETAIL page (requires DB)**

Create a throwaway file `scripts/seed-demo-template-page.ts`:

```ts
import { db } from "@/lib/db";

async function main() {
  const slug = "demo-phase-a";
  const blocks = [
    { type: "numberedList", title: "How it works", numberStyle: "circle", columns: 1,
      items: [{ heading: "Call us", body: "Reach out by phone or the form below." },
              { heading: "Get assessed", body: "We schedule an assessment." }] },
    { type: "iconList", title: "Why choose us", columns: 2,
      items: [{ icon: "Heart", label: "Compassionate care", body: "Person-first treatment." },
              { icon: "Shield", label: "Confidential", body: "Your privacy is protected." }] },
    { type: "richTextColumns", heading: "Our approach", dividers: true,
      columns: [{ title: "Therapy", body: "Evidence-based therapy." },
                { title: "Medication", body: "Managed by our psychiatrists." }] },
    { type: "imageTitleBeside", imagePosition: "left", imageSize: "md", verticalAlign: "top",
      title: "A welcoming environment",
      body: "Text beside the image.", image: { url: "", alt: "" } },
  ];

  const page = await db.page.upsert({
    where: { slug },
    update: { template: "SERVICE_DETAIL", status: "PUBLISHED", publishedVersion: 1 },
    create: {
      slug, title: "Demo Phase A", status: "PUBLISHED",
      template: "SERVICE_DETAIL", publishedVersion: 1,
    },
  });
  await db.pageVersion.upsert({
    where: { pageId_version: { pageId: page.id, version: 1 } },
    update: { blocks, status: "PUBLISHED" },
    create: { pageId: page.id, version: 1, status: "PUBLISHED", blocks },
  });
  console.log("Seeded /" + slug);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

Run: `npx tsx scripts/seed-demo-template-page.ts`
Expected: prints `Seeded /demo-phase-a`.

- [ ] **Step 4: Render check**

Run `npm run dev`, open `http://localhost:3000/demo-phase-a`, and confirm:
- Two-column layout: blocks on the left, sidebar on the right (stacks on mobile / narrow width).
- Numbered list shows circular number badges; icon list shows Heart/Shield icons; text columns show a divider; image-beside block renders its text (image area empty since no URL).
- Sidebar shows "Ready to Get Started?", the phone number as a `tel:` link, insurance list, and up to 3 related services.
- The appointment form appears below the blocks; clicking the sidebar "Request Information" button scrolls to it (`#contact-form`).

Then flip to a GENERAL page check: in Prisma Studio (`npm run db:studio`) set the demo page `template = GENERAL`, `hasSidebar = false`, reload — blocks render full-width with no sidebar; set `hasSidebar = true` — sidebar returns.

- [ ] **Step 5: Clean up the throwaway script and demo data**

```bash
rm scripts/seed-demo-template-page.ts
```

In Prisma Studio, delete the `demo-phase-a` Page (its `PageVersion` cascades). Do NOT commit the seed script or demo data.

- [ ] **Step 6: Commit (verification only — nothing to add if clean)**

No file changes to commit from this task. If `npm run build` produced incidental artifacts that are gitignored, confirm `git status` is clean of source changes.

---

## Self-review

**Spec coverage:**
- PageTemplate enum + template/hasSidebar fields + migration → Task 1. ✔
- 7 new block types in existing style → Task 3. ✔
- Icon resolver / lucide-react → Tasks 2, 4, 7. ✔
- 7 new block components → Tasks 6–11 (imageLeft/Right share Task 9 per the spec's shared-component decision). ✔
- BlockRenderer dispatch → Task 12. ✔
- ServiceSidebar (site.ts source, derived related services) → Task 13. ✔
- ServiceDetailTemplate (sidebar + canvas + pinned AppointmentForm) → Task 14. ✔
- GeneralTemplate (hasSidebar) → Task 15. ✔
- Catch-all dispatch by template → Task 16. ✔
- Build/lint/render acceptance → Task 17. ✔
- Out of scope (TinyMCE, admin UX, sanitize, service-page migration script, ?preview) → correctly absent. ✔

**Placeholder scan:** No TBD/TODO; all steps contain full code and exact commands. ✔

**Type consistency:** Component prop names match `blocks.ts`: `NumberedListBlock`/`IconListBlock`/`RichTextColumnsBlock`/`ImageTitleBelowBlock`/`ImageTitleBesideBlock` consumed as `{ block }`; `ImageTextSplitBlock` consumed as `{ block, imageSide }` with `block: ImageTextSplitFields` (both `imageLeftTextRight` and `imageRightTextLeft` are `ImageTextSplitFields & {type}`, assignable). `resolveIcon(name: string)` matches `IconListBlock.items[].icon: string`. Templates take `{ page: Page; blocks: Block[] }`, matching the catch-all call sites. ✔
