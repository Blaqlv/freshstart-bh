# Phase B — TinyMCE Rich Text: Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Source:** Part 5 of `prompt-6-page-templates-and-content-blocks.md` (TinyMCE), adapted.
**Depends on:** Phase A (`prompt-6-phase-a-templates`) — Phase B modifies the block
renderers and evolves the `Paragraphs` helper introduced in Phase A. This branch is
stacked on the Phase A branch.

## Context

Phase A renders all block bodies as plain-text paragraphs (the `Paragraphs` helper) and
authors blocks via plain `<textarea>` fields in `src/components/admin/PageEditor.tsx`.
Phase B introduces self-hosted TinyMCE 6 as the rich-text editor, switches rendering to
sanitized HTML, and wires the editor into the existing editable rich-text fields.

Findings that shape this phase:
- **No media endpoint exists.** The prompt assumed `/api/admin/media/upload` is present;
  it is not (there is a `Media` model and `src/lib/storage.ts`, but no API route).
- **Dev runs on Turbopack**, so the prompt's `webpack` externals config would not apply
  in dev — and is unnecessary regardless (see §1).
- **`PageEditor.BlockFields` only covers the old 8 block types.** The 7 new Phase A blocks
  have no edit forms yet (that is Phase C). Phase B wires TinyMCE into the existing
  editable rich-text fields only.

## Decisions (user-approved)

1. **Editor-side scope:** build the editor + sanitize + switch renderers to HTML, AND
   replace the plain textareas for the *existing* editable rich-text fields with TinyMCE.
   New blocks adopt the same editor when their forms are built in Phase C.
2. **Inline images deferred to Phase C:** Phase B TinyMCE ships with formatting, links, and
   lists only — no image button. Phase C builds the media upload endpoint + MediaPicker
   (block images need it too), and inline rich-text images come then.
3. **Text→HTML transition:** smart detection in the render helper — no data migration.

## Goal

Site admins author block body text with a real rich-text editor (bold/italic/underline,
lists, links, headings, alignment). Saved HTML is sanitized and rendered. Existing
plain-text content keeps rendering correctly with no migration.

## Scope

### In scope
1. Add deps: `tinymce`, `@tinymce/tinymce-react`, `isomorphic-dompurify`.
2. Self-host TinyMCE assets into `public/tinymce` via a cross-platform Node copy script
   chained into `postinstall`; gitignore the vendored copy.
3. `src/lib/sanitize.ts` — `sanitizeHtml()`.
4. Evolve the Phase A `Paragraphs` helper into `RichBody` (HTML-or-plain-text detection);
   route the existing inline body rendering in `BlockRenderer` through it too.
5. `src/components/admin/RichTextEditor.tsx` — TinyMCE `<Editor>` wrapper (full/minimal),
   no image upload.
6. Wire `<RichTextEditor>` into `PageEditor.BlockFields` for `richText.body` (full),
   `hero.body` (minimal), `ctaBanner.body` (minimal), FAQ answers (full).

### Out of scope (later / dropped)
- Media upload endpoint, MediaPicker, TinyMCE inline image upload → **Phase C**.
- Edit forms for the 7 new block types → **Phase C**.
- The prompt's `webpack` externals config → **dropped** (unnecessary; see §1).
- The prompt's `cp -r` postinstall → **replaced** with a cross-platform Node script.

## Design

### 1. Dependencies & self-hosting

Install `tinymce`, `@tinymce/tinymce-react`, `isomorphic-dompurify`. Do **not** add
`@types/dompurify` — `isomorphic-dompurify` bundles its own types and a separate
`@types/dompurify` can conflict.

**No `next.config.ts` change.** Self-hosted TinyMCE loads its core at runtime via
`tinymceScriptSrc="/tinymce/tinymce.min.js"` served from `public/`. Only the small
`@tinymce/tinymce-react` wrapper is imported into the bundle; the `tinymce` core package is
never imported in app code, so no bundler externals are required.

**Asset copy.** `scripts/copy-tinymce.mjs` recursively copies `node_modules/tinymce` →
`public/tinymce` using Node's `fs.cpSync` (cross-platform; the prompt's `cp -r` fails on
Windows). `postinstall` becomes `prisma generate && node scripts/copy-tinymce.mjs`. Add
`/public/tinymce` to `.gitignore` (several MB, regenerated on every install — not
committed). The script is idempotent (overwrites) and no-ops gracefully if the source is
missing (logs a warning, exits 0) so installs never break.

### 2. Sanitization (`src/lib/sanitize.ts`)

```ts
import DOMPurify from "isomorphic-dompurify";

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

Called at render time in server components, before `dangerouslySetInnerHTML`.

### 3. Render helper: `Paragraphs` → `RichBody`

Rename `src/components/cms/blocks/Paragraphs.tsx` to `RichBody.tsx` (export `RichBody`).
Behavior:
- If the text contains an HTML tag (detect with a simple `/<[a-z][\s\S]*>/i` test) →
  `sanitizeHtml(text)` and render via `dangerouslySetInnerHTML` inside a prose-styled div.
- Otherwise → legacy behavior: split on blank lines into `<p>` elements.
- Empty/whitespace → `null`.

Update the 6 new-block components that import `Paragraphs` to import `RichBody`. Also
update `BlockRenderer.tsx` so the existing inline body rendering for `richText`, `hero`,
`ctaBanner`, and FAQ answers routes through `RichBody` (so old blocks render HTML too).
The legacy fallback guarantees existing plain-text content is unaffected.

Prose styling: a shared `className` (e.g. `space-y-4 text-ink-soft [&_a]:text-brand-dark
[&_a]:underline [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal
[&_ol]:pl-5`) so sanitized HTML inherits brand styling. Callers may pass a custom
`className` as today.

### 4. Editor component (`src/components/admin/RichTextEditor.tsx`)

Client component wrapping `@tinymce/tinymce-react`'s `<Editor>`:
- Props: `value`, `onChange(value)`, `height?` (default 320), `minimalMode?`, `ariaLabel?`.
- `tinymceScriptSrc="/tinymce/tinymce.min.js"`; in `init`: `license_key: "gpl"`
  (required by TinyMCE 7+, the version npm installs), `branding: false`,
  `promotion: false`.
- Plugins/toolbar: full mode = formatting, alignment, lists, link, headings (styles),
  forecolor/backcolor, removeformat, code, fullscreen. Minimal mode = bold/italic/
  underline, link, lists. **No `image` plugin or toolbar item** (deferred to C).
- Brand `content_style` (font inherit, brand link color).
- Pass `ariaLabel` through to the editor's `init` (`a11y` requirement).

### 5. Wire into `PageEditor.BlockFields`

`PageEditor.tsx` is already a client component. Replace the `Area` (textarea) usage with
`<RichTextEditor>` for:
- `richText.body` — full
- `hero.body` — minimal
- `ctaBanner.body` — minimal
- `faqAccordion` answers — full

Heading/label/CTA/short fields stay as plain `<input>` (`Field`). The editor's `onChange`
feeds the same `update(i, patch)` flow; blocks continue to serialize to the hidden
`blocks` JSON input and save via the existing server actions. No server-action changes.

## Risks / notes

- **License:** self-hosted TinyMCE is **GPLv2+** (the prompt's "MIT" claim is incorrect).
  Used here as an editor inside a hosted web app (not distributed software), so practical
  obligations are minimal. `license_key: "gpl"` is set to acknowledge the community license
  and suppress the cloud-key prompt.
- **`public/tinymce` is gitignored** — deployments must run `npm install` (which runs
  `postinstall`) so the assets exist. Vercel does this by default.
- Switching old blocks to `RichBody` is safe: the legacy plain-text fallback preserves
  current rendering for all existing content.
- No DB access is required for any Phase B task; verification is `tsc` + `build` + a manual
  editor/render check.

## Acceptance criteria

- [ ] `tinymce`, `@tinymce/tinymce-react`, `isomorphic-dompurify` installed.
- [ ] `postinstall` copies TinyMCE to `public/tinymce` cross-platform; `public/tinymce`
      gitignored.
- [ ] `sanitizeHtml()` strips disallowed tags/attrs.
- [ ] `RichBody` renders sanitized HTML when tags present, paragraph-splits plain text
      otherwise; all 6 new-block components and the 4 existing inline-body cases use it.
- [ ] `RichTextEditor` renders without an API key (`license_key: "gpl"`), full and minimal
      toolbars work, no image button, has an `aria-label`.
- [ ] `PageEditor` uses `RichTextEditor` for richText/hero/ctaBanner/FAQ bodies; saving and
      rendering round-trips sanitized HTML.
- [ ] A legacy plain-text block still renders as paragraphs after the change.
- [ ] `npx tsc --noEmit` and `npm run build` pass.
