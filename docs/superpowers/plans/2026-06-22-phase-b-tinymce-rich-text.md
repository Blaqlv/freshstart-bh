# Phase B — TinyMCE Rich Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author existing block body text with self-hosted TinyMCE, render it as sanitized HTML, and keep existing plain-text content rendering unchanged.

**Architecture:** Self-hosted TinyMCE 7 loads its core at runtime from `public/tinymce` (copied there by a cross-platform postinstall script); only the React `<Editor>` wrapper is bundled. A `RichTextEditor` client component is wired into the existing rich-text fields in `PageEditor`. On render, the Phase A `Paragraphs` helper becomes `RichBody`, which sanitizes-and-renders HTML when tags are present and falls back to plain-text paragraph splitting otherwise. No data migration; no DB access required.

**Tech Stack:** Next.js 16 (App Router, RSC, Turbopack dev), React 19, `tinymce` + `@tinymce/tinymce-react`, `isomorphic-dompurify`, Tailwind v4.

**Depends on:** Phase A — this branch (`prompt-6-phase-b-tinymce`) is stacked on `prompt-6-phase-a-templates`.

**Testing note:** No unit-test runner in this repo. Per-task verification is `npx tsc --noEmit`; the final task runs `npm run build`, an objective `sanitizeHtml` check via a throwaway `tsx` script, a live render check (DB is reachable), and notes that the in-admin TinyMCE UI is best eyeballed by a human (admin routes are auth-gated).

**Conventions:** path alias `@/*` → `./src/*`; brand tokens `brand-dark`, `ink-soft`, etc.; commit per task with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` footer.

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `package.json` | Add deps; update `postinstall` | Modify |
| `scripts/copy-tinymce.mjs` | Cross-platform copy of TinyMCE assets to `public/` | Create |
| `.gitignore` | Ignore vendored `public/tinymce` | Modify |
| `src/lib/sanitize.ts` | `sanitizeHtml()` allowlist | Create |
| `src/components/cms/blocks/RichBody.tsx` | HTML-or-plain-text body renderer (was `Paragraphs.tsx`) | Rename + modify |
| `src/components/cms/blocks/{NumberedList,IconList,RichTextColumns,ImageTextSplit,ImageTitleBelow,ImageTitleBeside}Block.tsx` | Update import `Paragraphs` → `RichBody` | Modify (6 files) |
| `src/components/cms/BlockRenderer.tsx` | Route `richText`/`hero`/`ctaBanner`/FAQ bodies through `RichBody` | Modify |
| `src/components/admin/RichTextEditor.tsx` | TinyMCE `<Editor>` wrapper (full/minimal, no image) | Create |
| `src/components/admin/PageEditor.tsx` | Use `RichTextEditor` for richText/hero/ctaBanner/FAQ bodies | Modify |

---

## Task 1: Install dependencies

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

Run: `npm install tinymce @tinymce/tinymce-react isomorphic-dompurify`
Expected: all three appear under `dependencies`. If npm reports a React peer-dependency conflict, re-run as `npm install tinymce @tinymce/tinymce-react isomorphic-dompurify --legacy-peer-deps`.

Do NOT install `@types/dompurify` — `isomorphic-dompurify` bundles its own types.

- [ ] **Step 2: Verify imports resolve**

Run: `node -e "require('@tinymce/tinymce-react'); require('isomorphic-dompurify'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add tinymce, tinymce-react, isomorphic-dompurify

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Self-host TinyMCE assets (postinstall + gitignore)

**Files:** Create `scripts/copy-tinymce.mjs`; Modify `package.json`, `.gitignore`

- [ ] **Step 1: Write the copy script**

Create `scripts/copy-tinymce.mjs`:

```js
// Copies the self-hosted TinyMCE assets from node_modules into public/ so they
// are served at /tinymce/*. Runs in postinstall. Cross-platform (uses Node fs,
// not `cp`), and never fails the install if the source is missing.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const src = join("node_modules", "tinymce");
const dest = join("public", "tinymce");

if (!existsSync(src)) {
  console.warn("[copy-tinymce] node_modules/tinymce not found; skipping.");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-tinymce] copied tinymce -> public/tinymce");
```

- [ ] **Step 2: Update the postinstall script**

In `package.json`, change the `postinstall` line from:

```json
    "postinstall": "prisma generate",
```

to:

```json
    "postinstall": "prisma generate && node scripts/copy-tinymce.mjs",
```

- [ ] **Step 3: Gitignore the vendored assets**

Append to `.gitignore`:

```
# self-hosted TinyMCE assets (vendored from node_modules by postinstall)
/public/tinymce
```

- [ ] **Step 4: Run the copy and verify the asset exists**

Run: `node scripts/copy-tinymce.mjs`
Expected: prints `[copy-tinymce] copied tinymce -> public/tinymce`.

Run: `test -f public/tinymce/tinymce.min.js && echo FOUND`
Expected: prints `FOUND`.

Run: `git status --short public/tinymce`
Expected: no output (the directory is ignored).

- [ ] **Step 5: Commit**

```bash
git add scripts/copy-tinymce.mjs package.json .gitignore
git commit -m "$(cat <<'EOF'
Self-host TinyMCE assets via cross-platform postinstall copy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: HTML sanitizer

**Files:** Create `src/lib/sanitize.ts`

- [ ] **Step 1: Write the sanitizer**

```ts
import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize TinyMCE HTML before rendering via dangerouslySetInnerHTML. Allowlist
 * matches the editor's formatting capabilities; everything else is stripped.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h2", "h3", "h4", "blockquote", "pre", "code", "span", "div", "hr", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "src", "alt", "width", "height"],
  });
}
```

- [ ] **Step 2: Objective check (throwaway script)**

Create `scripts/_check-sanitize.ts`:

```ts
import { sanitizeHtml } from "../src/lib/sanitize";

const out = sanitizeHtml('<p>Hi <strong>there</strong></p><script>alert(1)</script><a href="x" onclick="bad()">l</a>');
const ok = out.includes("<strong>") && !out.includes("<script") && !out.includes("onclick");
console.log(out);
console.log(ok ? "SANITIZE_OK" : "SANITIZE_FAIL");
process.exit(ok ? 0 : 1);
```

Run: `npx tsx scripts/_check-sanitize.ts`
Expected: prints sanitized HTML then `SANITIZE_OK`.

- [ ] **Step 3: Remove the throwaway script**

Run: `rm scripts/_check-sanitize.ts`

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sanitize.ts
git commit -m "$(cat <<'EOF'
Add sanitizeHtml allowlist for TinyMCE output

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: RichBody render helper (rename Paragraphs, add HTML detection)

**Files:** Rename `src/components/cms/blocks/Paragraphs.tsx` → `src/components/cms/blocks/RichBody.tsx`; Modify 6 block components.

- [ ] **Step 1: Rename the file (preserve history)**

Run: `git mv src/components/cms/blocks/Paragraphs.tsx src/components/cms/blocks/RichBody.tsx`

- [ ] **Step 2: Replace the file contents**

Overwrite `src/components/cms/blocks/RichBody.tsx` with:

```tsx
import { sanitizeHtml } from "@/lib/sanitize";

// Color-agnostic element styling so sanitized HTML reads well on both light and
// dark backgrounds (callers control text color via className). Links inherit
// color and just underline; lists get markers + indent.
const HTML_EXTRAS =
  "[&_a]:underline [&_a]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5";

const HAS_TAG = /<[a-z][\s\S]*>/i;

/**
 * Renders a block body. If it contains HTML tags (TinyMCE output) it is
 * sanitized and rendered as HTML; otherwise it is treated as legacy plain text
 * and split on blank lines into paragraphs. Empty input renders nothing.
 */
export function RichBody({
  text,
  className = "space-y-4 text-ink-soft",
}: {
  text?: string;
  className?: string;
}) {
  if (!text || !text.trim()) return null;

  if (HAS_TAG.test(text)) {
    return (
      <div
        className={`${className} ${HTML_EXTRAS}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }

  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update the 6 block components**

In each of these files, change the import and the JSX tag from `Paragraphs` to `RichBody`:
- `src/components/cms/blocks/NumberedListBlock.tsx`
- `src/components/cms/blocks/IconListBlock.tsx`
- `src/components/cms/blocks/RichTextColumnsBlock.tsx`
- `src/components/cms/blocks/ImageTextSplitBlock.tsx`
- `src/components/cms/blocks/ImageTitleBelowBlock.tsx`
- `src/components/cms/blocks/ImageTitleBesideBlock.tsx`

In every file replace:
```tsx
import { Paragraphs } from "./Paragraphs";
```
with:
```tsx
import { RichBody } from "./RichBody";
```

And replace each `<Paragraphs ` occurrence with `<RichBody ` (keep the same props). After editing, confirm none remain:

Run: `grep -rn "Paragraphs" src`
Expected: no output.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/cms/blocks
git commit -m "$(cat <<'EOF'
Rename Paragraphs to RichBody with sanitized-HTML detection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Route existing blocks through RichBody

**Files:** Modify `src/components/cms/BlockRenderer.tsx`

- [ ] **Step 1: Import RichBody**

After the existing block-component imports near the top of `BlockRenderer.tsx`, add:

```tsx
import { RichBody } from "./blocks/RichBody";
```

- [ ] **Step 2: hero body**

Replace:
```tsx
            {block.body && <p className="mt-4 max-w-2xl text-lg text-white/85">{block.body}</p>}
```
with:
```tsx
            {block.body && <RichBody text={block.body} className="mt-4 max-w-2xl text-lg text-white/85" />}
```

- [ ] **Step 3: richText body**

Replace:
```tsx
            <div className="mt-3 space-y-4 text-ink-soft">
              {block.body.split(/\n\s*\n/).map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
```
with:
```tsx
            <RichBody text={block.body} className="mt-3 space-y-4 text-ink-soft" />
```

- [ ] **Step 4: ctaBanner body**

Replace:
```tsx
              {block.body && <p className="mt-1 text-white/90">{block.body}</p>}
```
with:
```tsx
              {block.body && <RichBody text={block.body} className="mt-1 text-white/90" />}
```

- [ ] **Step 5: FAQ answer**

Replace:
```tsx
                  <p className="mt-3 text-ink-soft">{f.a}</p>
```
with:
```tsx
                  <RichBody text={f.a} className="mt-3 text-ink-soft" />
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/cms/BlockRenderer.tsx
git commit -m "$(cat <<'EOF'
Render existing block bodies through RichBody (HTML + legacy text)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: RichTextEditor component

**Files:** Create `src/components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Write the component**

`import type { Editor as TinyMCEEditor } from "tinymce"` is a type-only import — it is erased at build time and does NOT bundle the TinyMCE core (the core loads from `/tinymce` via `tinymceScriptSrc`).

```tsx
"use client";

import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";

const FULL_TOOLBAR =
  "undo redo | styles | bold italic underline strikethrough | " +
  "alignleft aligncenter alignright | bullist numlist outdent indent | " +
  "link | forecolor backcolor removeformat | code fullscreen";

const MINIMAL_TOOLBAR = "bold italic underline | link | bullist numlist";

const FULL_PLUGINS = [
  "advlist", "autolink", "lists", "link", "charmap",
  "searchreplace", "visualblocks", "code", "fullscreen", "wordcount",
];

export function RichTextEditor({
  value,
  onChange,
  height = 320,
  minimalMode = false,
  ariaLabel = "Rich text editor",
}: {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  minimalMode?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      value={value}
      onEditorChange={onChange}
      init={{
        height,
        menubar: false,
        license_key: "gpl",
        branding: false,
        promotion: false,
        statusbar: !minimalMode,
        resize: !minimalMode,
        plugins: minimalMode ? ["lists", "link"] : FULL_PLUGINS,
        toolbar: minimalMode ? MINIMAL_TOOLBAR : FULL_TOOLBAR,
        content_style:
          "body{font-family:inherit;font-size:16px;line-height:1.6;color:#1a1a1a;padding:12px}" +
          "p{margin:0 0 1em}a{color:#1f3a5f}",
        setup: (editor: TinyMCEEditor) => {
          // Label the editor's iframe for assistive tech.
          editor.on("init", () => {
            const iframe = editor.getContainer()?.querySelector("iframe");
            iframe?.setAttribute("title", ariaLabel);
          });
        },
      }}
    />
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `tinymce` has no bundled types for the type-only import, install is already present from Task 1; the `tinymce` package ships its own `.d.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/RichTextEditor.tsx
git commit -m "$(cat <<'EOF'
Add self-hosted TinyMCE RichTextEditor (full/minimal, no image)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wire RichTextEditor into PageEditor

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Import the editor**

After the existing imports at the top of `PageEditor.tsx`, add:

```tsx
import { RichTextEditor } from "./RichTextEditor";
```

- [ ] **Step 2: Add a labeled rich-text field helper**

Add this helper next to the existing `Field`/`Area` helpers at the bottom of the file:

```tsx
function RichField({
  label,
  value,
  onChange,
  minimal = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minimal?: boolean;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">
        <RichTextEditor
          value={value}
          onChange={onChange}
          minimalMode={minimal}
          ariaLabel={label}
          height={minimal ? 200 : 320}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: hero body → minimal editor**

In `BlockFields`, in the `case "hero"` branch, replace:
```tsx
          <Area label="Body" value={block.body ?? ""} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
```
with:
```tsx
          <RichField label="Body" value={block.body ?? ""} onChange={(v) => onChange({ body: v } as Partial<Block>)} minimal />
```

- [ ] **Step 4: richText body → full editor**

In the `case "richText"` branch, replace:
```tsx
          <Area label="Body (blank line = new paragraph)" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
```
with:
```tsx
          <RichField label="Body" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
```

- [ ] **Step 5: ctaBanner body → minimal editor**

In the `case "ctaBanner"` branch, replace:
```tsx
          <Field label="Body" value={block.body ?? ""} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
```
with:
```tsx
          <RichField label="Body" value={block.body ?? ""} onChange={(v) => onChange({ body: v } as Partial<Block>)} minimal />
```

- [ ] **Step 6: FAQ answer → full editor**

In the `case "faqAccordion"` branch, replace:
```tsx
              <Area
                label="Answer"
                value={it.a}
                onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, a: v } : x)) } as Partial<Block>)}
              />
```
with:
```tsx
              <RichField
                label="Answer"
                value={it.a}
                onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, a: v } : x)) } as Partial<Block>)}
              />
```

- [ ] **Step 7: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. (Note: `Area` may now be unused if no other case uses it. If lint/tsc flags it as unused, remove the `Area` function definition. Verify with `grep -n "<Area" src/components/admin/PageEditor.tsx` — if no matches remain, delete the `Area` helper.)

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Use TinyMCE for richText/hero/ctaBanner/FAQ body fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Full verification

**Files:** none modified (verification + throwaway seed).

- [ ] **Step 1: Lint the new/changed files**

Run: `npx eslint src/lib/sanitize.ts src/components/cms/blocks/RichBody.tsx src/components/cms/BlockRenderer.tsx src/components/admin/RichTextEditor.tsx src/components/admin/PageEditor.tsx`
Expected: no errors (warnings acceptable). Fix any errors before continuing.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: "Compiled successfully" — no type or build errors.

- [ ] **Step 3: Serve check — TinyMCE asset is reachable**

Start the dev server in the background, then:

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tinymce/tinymce.min.js`
Expected: `200`.

- [ ] **Step 4: Render check — HTML body + legacy plain-text body**

Create `scripts/_seed-richbody.ts`:

```ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const slug = "demo-phase-b";
  const blocks = [
    { type: "richText", heading: "HTML body", body: "<p>Hi <strong>bold</strong> and <em>italic</em></p><ul><li>one</li><li>two</li></ul>" },
    { type: "richText", heading: "Legacy body", body: "First paragraph.\n\nSecond paragraph." },
  ];
  const page = await db.page.upsert({
    where: { slug },
    update: { template: "GENERAL", status: "PUBLISHED", publishedVersion: 1 },
    create: { slug, title: "Demo Phase B", status: "PUBLISHED", template: "GENERAL", publishedVersion: 1 },
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

Run: `npx tsx scripts/_seed-richbody.ts`
Expected: prints `Seeded /demo-phase-b`.

Run:
```bash
h=$(curl -s --max-time 60 http://localhost:3000/demo-phase-b)
printf '%s' "$h" | grep -qF "<strong>bold</strong>" && echo "HTML_OK"
printf '%s' "$h" | grep -qF "<li>one</li>" && echo "LIST_OK"
printf '%s' "$h" | grep -qF "<p>First paragraph.</p>" && echo "LEGACY_OK"
printf '%s' "$h" | grep -qiF "onclick" && echo "UNSAFE_FOUND" || echo "NO_UNSAFE"
```
Expected: `HTML_OK`, `LIST_OK`, `LEGACY_OK`, `NO_UNSAFE`.

- [ ] **Step 5: Clean up**

Run:
```bash
npx tsx -e "import('@prisma/client').then(async ({PrismaClient})=>{const d=new PrismaClient();await d.page.deleteMany({where:{slug:'demo-phase-b'}});process.exit(0)})"
rm -f scripts/_seed-richbody.ts
```
Then stop the dev server. Confirm `git status --short` shows no demo artifacts.

- [ ] **Step 6: Human verification note (not a code step)**

The in-admin TinyMCE editor is auth-gated, so it must be eyeballed by a human: log in to `/admin`, open a page at `/admin/pages/<id>`, confirm the TinyMCE toolbar renders for the richText/hero/ctaBanner/FAQ body fields, type formatted text, save, and view the published page. (No commit; report this as a manual follow-up.)

---

## Self-review

**Spec coverage:**
- Deps (`tinymce`, `@tinymce/tinymce-react`, `isomorphic-dompurify`) → Task 1. ✔
- Cross-platform postinstall copy + gitignore → Task 2. ✔
- `sanitizeHtml` → Task 3. ✔
- `Paragraphs` → `RichBody` with HTML detection + 6 importers → Task 4. ✔
- Existing blocks (richText/hero/ctaBanner/FAQ) routed through `RichBody` → Task 5. ✔
- `RichTextEditor` (full/minimal, no image, `license_key: gpl`, aria-label) → Task 6. ✔
- Wire into PageEditor richText(full)/hero(minimal)/ctaBanner(minimal)/FAQ(full) → Task 7. ✔
- No `next.config` change (intentional) → not a task, correctly absent. ✔
- Out of scope (media endpoint, MediaPicker, inline images, new-block forms) → correctly absent. ✔
- Verification (build + sanitize check + render check incl. legacy fallback) → Tasks 3, 8. ✔

**Placeholder scan:** No TBD/TODO; every code step has full code and exact commands. ✔

**Type consistency:** `RichBody({ text?, className? })` — same prop names as the former `Paragraphs`, so the 6 importers need only a name change. `RichTextEditor({ value, onChange, height?, minimalMode?, ariaLabel? })` consumed by `RichField` with exactly those props; `RichField({ label, value, onChange, minimal? })` consumed in BlockFields with matching props. `sanitizeHtml(dirty: string): string` consumed by `RichBody`. ✔
