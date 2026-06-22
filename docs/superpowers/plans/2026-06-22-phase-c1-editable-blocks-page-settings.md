# Phase C1 — Editable Blocks & Page Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins choose a page's template/sidebar and fully configure all 15 block types (including the 7 new ones) through real form fields, and hide a block without deleting it.

**Architecture:** Extend the existing inline `PageEditor` (`BlockFields` switch) with forms for the new block types, reusing Phase B's `RichTextEditor` for rich fields and ↑/↓ buttons for repeatable items. Add `template`/`hasSidebar` controls that persist via the existing `persistDraft` server action. Add a per-block `isVisible` flag (one intersection on the `Block` union) with an editor toggle and a renderer filter. No schema/migration change — `isVisible` lives in the existing `PageVersion.blocks` JSON.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Prisma 6, Tailwind v4, Phase B `RichTextEditor`.

**Depends on:** Phase A + Phase B. This branch (`prompt-6-phase-c1-block-forms`) is stacked on the Phase B branch.

**Testing note:** No unit-test runner. Per-task verification is `npx tsc --noEmit`; the final task runs `npm run build`, lint, and an automated renderer-filter check (DB reachable). The full editor round-trip is auth-gated, so it is a human follow-up.

**Conventions:** existing `PageEditor` helpers `Field` (text input) and `RichField` (Phase B editor) are reused; `labelCls` and `input` class constants already exist in the file. RBAC is enforced in the actions already (no change). Commit per task with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` footer.

**Already done (do NOT re-add):** the Unpublish + Delete buttons already exist in `src/app/admin/pages/[id]/page.tsx` (below the editor, gated by `canPublish`). The spec's "Unpublish button" requirement is already satisfied.

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `src/lib/cms/blocks.ts` | Add `isVisible?` to the `Block` union | Modify |
| `src/components/cms/BlockRenderer.tsx` | Filter out hidden blocks | Modify |
| `src/app/admin/pages/actions.ts` | Persist `template`/`hasSidebar` in `persistDraft` | Modify |
| `src/app/admin/pages/[id]/page.tsx` | Pass `template`/`hasSidebar` into `PageEditor` | Modify |
| `src/components/admin/PageEditor.tsx` | Settings controls, visibility toggle, new-block forms, `Radio`/`Toggle`/`moved` helpers | Modify |

`PageEditor.tsx` grows notably in this phase. That is accepted for C1: Phase C3 restructures the editor into slide-over panels, so a larger split now would be thrown away. Keep the additions inline in the existing `BlockFields` switch.

---

## Task 1: Per-block visibility (type + renderer filter)

**Files:** Modify `src/lib/cms/blocks.ts`, `src/components/cms/BlockRenderer.tsx`

- [ ] **Step 1: Add `isVisible` to the Block union**

In `src/lib/cms/blocks.ts`, replace the existing `Block` union:

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

with the same union wrapped in an intersection that adds the optional flag:

```ts
export type Block = (
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
  | ImageTitleBesideBlock
) & { isVisible?: boolean };
```

(`undefined`/`true` = visible; `false` = hidden. TypeScript distributes the intersection over the union, so `switch (block.type)` narrowing still works.)

- [ ] **Step 2: Filter hidden blocks in the renderer**

In `src/components/cms/BlockRenderer.tsx`, change the map to filter first:

```tsx
  return (
    <>
      {blocks
        .filter((block) => block.isVisible !== false)
        .map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
    </>
  );
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. (This confirms the union intersection preserves discriminated narrowing across `BlockRenderer` and `PageEditor`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/cms/blocks.ts src/components/cms/BlockRenderer.tsx
git commit -m "$(cat <<'EOF'
Add per-block isVisible flag and filter hidden blocks on render

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Page settings (template + sidebar) with persistence

**Files:** Modify `src/app/admin/pages/actions.ts`, `src/app/admin/pages/[id]/page.tsx`, `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Persist the fields in the server action**

In `src/app/admin/pages/actions.ts`, inside `persistDraft`, locate the `db.page.update({ ... data: { ... } })` call and add `template` and `hasSidebar` to its `data` object (after `ogImageUrl`):

```ts
        template:
          String(formData.get("template")) === "SERVICE_DETAIL" ? "SERVICE_DETAIL" : "GENERAL",
        hasSidebar: String(formData.get("hasSidebar")) === "true",
```

(Validated explicitly so a bad value cannot reach the enum column.)

- [ ] **Step 2: Pass the fields into PageEditor**

In `src/app/admin/pages/[id]/page.tsx`, add the two fields to the `page={{ ... }}` object passed to `<PageEditor>` (after `ogImageUrl`):

```tsx
          template: page.template,
          hasSidebar: page.hasSidebar,
```

- [ ] **Step 3: Extend PageData and add state in PageEditor**

In `src/components/admin/PageEditor.tsx`:

Change the type import to include `PageTemplate`:
```tsx
import type { ContentStatus, PageTemplate } from "@prisma/client";
```

Add to the `PageData` type (after `ogImageUrl: string;`):
```tsx
  template: PageTemplate;
  hasSidebar: boolean;
```

Add state next to the existing `const [title, setTitle] = useState(page.title);`:
```tsx
  const [template, setTemplate] = useState<PageTemplate>(page.template);
  const [hasSidebar, setHasSidebar] = useState(page.hasSidebar);
```

- [ ] **Step 4: Add the Radio and Toggle helpers**

At the bottom of `src/components/admin/PageEditor.tsx`, next to the existing `Field`/`RichField` helpers, add:

```tsx
function Radio({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-1.5 text-sm text-ink">
            <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function moved<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}
```

- [ ] **Step 5: Add hidden inputs + settings UI**

In the form, next to the existing hidden inputs (`pageId`, `blocks`), add:
```tsx
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="hasSidebar" value={String(hasSidebar)} />
```

Then, immediately after the existing page-title `<div>` block, add the settings panel:
```tsx
      <div className="space-y-3 rounded-card border border-line bg-white p-4">
        <Radio
          label="Template"
          value={template}
          options={[
            { value: "SERVICE_DETAIL", label: "Service Detail page" },
            { value: "GENERAL", label: "General page" },
          ]}
          onChange={(v) => setTemplate(v as PageTemplate)}
        />
        {template === "GENERAL" && (
          <Toggle
            label="Show sidebar with contact CTAs and insurance information"
            checked={hasSidebar}
            onChange={setHasSidebar}
          />
        )}
      </div>
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/pages/actions.ts "src/app/admin/pages/[id]/page.tsx" src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Persist page template and sidebar from the editor settings panel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Block visibility toggle in the editor

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Add a hidden style + visibility toggle to each block card**

In the blocks list, find the block card wrapper and its header action buttons. Replace the card wrapper opening tag:
```tsx
          <div key={i} className="rounded-card border border-line bg-white">
```
with one that dims hidden blocks:
```tsx
          <div
            key={i}
            className={`rounded-card border border-line bg-white ${block.isVisible === false ? "opacity-60" : ""}`}
          >
```

In the header, update the label span to mark hidden blocks:
```tsx
              <span className="text-sm font-semibold text-brand-dark">
                {blockLabel(block.type)}
                {block.isVisible === false && (
                  <span className="ml-2 rounded bg-surface-alt px-1.5 py-0.5 text-xs font-normal text-ink-soft">
                    Hidden
                  </span>
                )}
              </span>
```

Add a visibility toggle button to the header's button group (before the Move-up button):
```tsx
                <button
                  type="button"
                  onClick={() => update(i, { isVisible: block.isVisible === false } as Partial<Block>)}
                  aria-label={block.isVisible === false ? "Show block" : "Hide block"}
                  className="rounded p-1 hover:bg-white"
                >
                  {block.isVisible === false ? "🙈" : "👁"}
                </button>
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Add per-block visibility toggle to the page editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Edit forms — numberedList & iconList

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Add the two cases to `BlockFields`**

In the `switch (block.type)` inside `BlockFields`, add these cases before the `default:` case:

```tsx
    case "numberedList":
      return (
        <>
          <Field label="Title" value={block.title ?? ""} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Intro" value={block.intro ?? ""} onChange={(v) => onChange({ intro: v } as Partial<Block>)} minimal />
          <Radio
            label="Number style"
            value={block.numberStyle ?? "circle"}
            options={[{ value: "circle", label: "Circle" }, { value: "square", label: "Square" }, { value: "plain", label: "Plain" }]}
            onChange={(v) => onChange({ numberStyle: v } as Partial<Block>)}
          />
          <Radio
            label="Columns"
            value={String(block.columns ?? 1)}
            options={[{ value: "1", label: "1 column" }, { value: "2", label: "2 columns" }]}
            onChange={(v) => onChange({ columns: Number(v) } as Partial<Block>)}
          />
          {block.items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Item {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move item up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, -1) } as Partial<Block>)}>↑</button>
                  <button type="button" aria-label="Move item down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, 1) } as Partial<Block>)}>↓</button>
                  <button type="button" aria-label="Remove item" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onChange({ items: block.items.filter((_, k) => k !== idx) } as Partial<Block>)}>✕</button>
                </div>
              </div>
              <Field label="Heading" value={it.heading} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, heading: v } : x)) } as Partial<Block>)} />
              <RichField label="Description" value={it.body ?? ""} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, body: v } : x)) } as Partial<Block>)} minimal />
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ items: [...block.items, { heading: "", body: "" }] } as Partial<Block>)}>+ Add item</button>
        </>
      );
    case "iconList":
      return (
        <>
          <Field label="Title" value={block.title ?? ""} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Intro" value={block.intro ?? ""} onChange={(v) => onChange({ intro: v } as Partial<Block>)} minimal />
          <Field label="Icon colour (hex or token, optional)" value={block.iconColor ?? ""} onChange={(v) => onChange({ iconColor: v } as Partial<Block>)} />
          <Radio
            label="Columns"
            value={String(block.columns ?? 1)}
            options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }]}
            onChange={(v) => onChange({ columns: Number(v) } as Partial<Block>)}
          />
          {block.items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Item {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move item up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, -1) } as Partial<Block>)}>↑</button>
                  <button type="button" aria-label="Move item down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, 1) } as Partial<Block>)}>↓</button>
                  <button type="button" aria-label="Remove item" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onChange({ items: block.items.filter((_, k) => k !== idx) } as Partial<Block>)}>✕</button>
                </div>
              </div>
              <Field label="Icon (Lucide name, e.g. CheckCircle2)" value={it.icon} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, icon: v } : x)) } as Partial<Block>)} />
              <Field label="Label" value={it.label} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, label: v } : x)) } as Partial<Block>)} />
              <RichField label="Description" value={it.body ?? ""} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, body: v } : x)) } as Partial<Block>)} minimal />
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ items: [...block.items, { icon: "CheckCircle2", label: "", body: "" }] } as Partial<Block>)}>+ Add item</button>
        </>
      );
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Add editor forms for numberedList and iconList blocks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Edit form — richTextColumns

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Add the case to `BlockFields`**

Add this case before the `default:` case (after the `iconList` case):

```tsx
    case "richTextColumns":
      return (
        <>
          <Field label="Heading" value={block.heading ?? ""} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <RichField label="Intro" value={block.intro ?? ""} onChange={(v) => onChange({ intro: v } as Partial<Block>)} />
          <Toggle label="Vertical dividers between columns" checked={!!block.dividers} onChange={(v) => onChange({ dividers: v } as Partial<Block>)} />
          {block.columns.map((col, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Column {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move column up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ columns: moved(block.columns, idx, -1) } as Partial<Block>)}>↑</button>
                  <button type="button" aria-label="Move column down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ columns: moved(block.columns, idx, 1) } as Partial<Block>)}>↓</button>
                  <button type="button" aria-label="Remove column" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onChange({ columns: block.columns.filter((_, k) => k !== idx) } as Partial<Block>)}>✕</button>
                </div>
              </div>
              <Field label="Column title" value={col.title ?? ""} onChange={(v) => onChange({ columns: block.columns.map((x, k) => (k === idx ? { ...x, title: v } : x)) } as Partial<Block>)} />
              <RichField label="Body" value={col.body} onChange={(v) => onChange({ columns: block.columns.map((x, k) => (k === idx ? { ...x, body: v } : x)) } as Partial<Block>)} />
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ columns: [...block.columns, { title: "", body: "" }] } as Partial<Block>)}>+ Add column</button>
        </>
      );
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Add editor form for richTextColumns block

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Edit forms — image blocks

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Add the image-block cases to `BlockFields`**

Add these cases before the `default:` case (after `richTextColumns`). The two split blocks share one fall-through case (identical fields):

```tsx
    case "imageLeftTextRight":
    case "imageRightTextLeft":
      return (
        <>
          <Field label="Image URL" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <Field label="Image alt text" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
          <Radio
            label="Image width"
            value={String(block.imageWidthPercent ?? 50)}
            options={[{ value: "40", label: "40%" }, { value: "45", label: "45%" }, { value: "50", label: "50%" }]}
            onChange={(v) => onChange({ imageWidthPercent: Number(v) } as Partial<Block>)}
          />
          <Field label="Title" value={block.title} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA label" value={block.ctaLabel ?? ""} onChange={(v) => onChange({ ctaLabel: v } as Partial<Block>)} />
            <Field label="CTA link" value={block.ctaHref ?? ""} onChange={(v) => onChange({ ctaHref: v } as Partial<Block>)} />
          </div>
        </>
      );
    case "imageTitleBelow":
      return (
        <>
          <Field label="Image URL" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <Field label="Image alt text" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
          <Radio
            label="Aspect ratio"
            value={block.aspectRatio ?? "16/9"}
            options={[{ value: "16/9", label: "16:9" }, { value: "4/3", label: "4:3" }, { value: "1/1", label: "1:1" }, { value: "3/2", label: "3:2" }]}
            onChange={(v) => onChange({ aspectRatio: v } as Partial<Block>)}
          />
          <Radio
            label="Max width"
            value={block.maxWidth ?? "lg"}
            options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "full", label: "Full" }]}
            onChange={(v) => onChange({ maxWidth: v } as Partial<Block>)}
          />
          <Field label="Title" value={block.title} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Caption" value={block.caption ?? ""} onChange={(v) => onChange({ caption: v } as Partial<Block>)} minimal />
        </>
      );
    case "imageTitleBeside":
      return (
        <>
          <Field label="Image URL" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <Field label="Image alt text" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
          <Radio
            label="Image position"
            value={block.imagePosition}
            options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]}
            onChange={(v) => onChange({ imagePosition: v } as Partial<Block>)}
          />
          <Radio
            label="Image size"
            value={block.imageSize ?? "md"}
            options={[{ value: "sm", label: "Small (30%)" }, { value: "md", label: "Medium (40%)" }, { value: "lg", label: "Large (50%)" }]}
            onChange={(v) => onChange({ imageSize: v } as Partial<Block>)}
          />
          <Radio
            label="Vertical alignment"
            value={block.verticalAlign ?? "top"}
            options={[{ value: "top", label: "Top" }, { value: "center", label: "Centre" }]}
            onChange={(v) => onChange({ verticalAlign: v } as Partial<Block>)}
          />
          <Field label="Title" value={block.title} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
        </>
      );
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. (This confirms the nested `image` updates and literal-union radios type-check for all four image blocks.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Add editor forms for the four image blocks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Verification

**Files:** none modified (verification + throwaway seed).

- [ ] **Step 1: Lint changed files**

Run: `npx eslint src/lib/cms/blocks.ts src/components/cms/BlockRenderer.tsx src/app/admin/pages/actions.ts "src/app/admin/pages/[id]/page.tsx" src/components/admin/PageEditor.tsx`
Expected: no errors (warnings acceptable). Fix any errors before continuing.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 3: Renderer visibility-filter check (DB reachable)**

Create `scripts/_seed-visibility.ts`:

```ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const slug = "demo-c1";
  const blocks = [
    { type: "richText", heading: "Shown block", body: "VISIBLE_MARKER" },
    { type: "richText", heading: "Hidden block", body: "HIDDEN_MARKER", isVisible: false },
  ];
  const page = await db.page.upsert({
    where: { slug },
    update: { template: "GENERAL", status: "PUBLISHED", publishedVersion: 1 },
    create: { slug, title: "Demo C1", status: "PUBLISHED", template: "GENERAL", publishedVersion: 1 },
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

Run: `npx tsx scripts/_seed-visibility.ts`
Expected: prints `Seeded /demo-c1`.

Start the dev server in the background, then:
```bash
h=$(curl -s --max-time 60 http://localhost:3000/demo-c1)
printf '%s' "$h" | grep -qF "VISIBLE_MARKER" && echo "VISIBLE_OK"
printf '%s' "$h" | grep -qF "HIDDEN_MARKER" && echo "HIDDEN_RENDERED_BAD" || echo "HIDDEN_FILTERED_OK"
```
Expected: `VISIBLE_OK` and `HIDDEN_FILTERED_OK`.

- [ ] **Step 4: Clean up**

```bash
npx tsx -e "import('@prisma/client').then(async ({PrismaClient})=>{const d=new PrismaClient();await d.page.deleteMany({where:{slug:'demo-c1'}});process.exit(0)})"
rm -f scripts/_seed-visibility.ts
```
Stop the dev server. Confirm `git status --short` shows no demo artifacts.

- [ ] **Step 5: Human verification note (not a code step)**

The full editor round-trip is auth-gated, so verify manually: log in to `/admin`, open a page at `/admin/pages/<id>`, set the template to General and toggle the sidebar, add one of each new block type and fill its fields, hide a block (eye toggle), Save & publish, then view the published page and confirm the settings, block content, and hidden-block exclusion all took effect. (No commit; report as a manual follow-up.)

---

## Self-review

**Spec coverage:**
- Template radio + conditional sidebar toggle + persistence → Task 2. ✔
- Unpublish button → already exists (noted; no task). ✔
- Edit forms for all 7 new block types (text, radios, toggles, rich-text, add/remove/↑↓ items) → Tasks 4, 5, 6. ✔
- Per-block `isVisible` (type + editor toggle + renderer filter) → Tasks 1, 3. ✔
- Out of scope (slug edit, dnd, slide-overs, pickers, media endpoints, autosave, filters) → correctly absent. ✔
- Verification (tsc/build + renderer filter + manual editor note) → Task 7. ✔

**Placeholder scan:** No TBD/TODO; every code step has full code and exact commands. ✔

**Type consistency:** Block config field names match `blocks.ts` (Phase A): `numberedList.{title?,intro?,items[{heading,body?}],numberStyle?,columns?}`, `iconList.{...,items[{icon,label,body?}],iconColor?,columns?}`, `richTextColumns.{heading?,intro?,columns[{title?,body}],dividers?}`, image blocks `{image:{url,alt},...}`. Helpers `Field`/`RichField` (existing) and new `Radio`/`Toggle`/`moved` are defined in Task 2 before first use in Tasks 4–6. `Radio.onChange(v: string)` with numeric/literal casts at call sites; `Toggle.onChange(v: boolean)`. `PageData` gains `template: PageTemplate; hasSidebar: boolean`, set in the route (Task 2) and consumed by state. ✔
