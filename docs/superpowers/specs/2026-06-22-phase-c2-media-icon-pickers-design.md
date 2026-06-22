# Phase C2 — Media & Icon Pickers: Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Source:** Part 6 of `prompt-6-page-templates-and-content-blocks.md` (MediaPicker,
IconPicker, media endpoints) + the Phase B deferral of TinyMCE inline images.
**Depends on:** Phase A (block types, `resolveIcon`), Phase B (`RichTextEditor`),
Phase C1 (image/icon edit fields). This branch
(`prompt-6-phase-c2-media-icon-pickers`) is stacked on the C1 branch.

## Context

C1 added edit forms for all block types but used **plain inputs**: image fields are URL
text inputs; `iconList` icons are Lucide-name text inputs. C2 replaces those with visual
pickers and builds the media backend they need. It also re-enables TinyMCE inline image
upload, which Phase B deferred.

Relevant existing code:
- `src/lib/storage.ts` — `putObject(key, body, contentType)`, `getObject(key)`,
  `deleteObject(key)`; uses Cloudflare R2 when `R2_*` env is set, else a local `.uploads/`
  fallback. It stores files **privately** — there is no public URL scheme.
- `Media` model (`prisma/schema.prisma`): `id, url, alt, mimeType, width?, height?,
  sizeBytes?, uploadedById?, createdAt`. **No `fileName` or `storageKey` column.**
- Auth for API routes: `getSession()` (returns `Session | null`; `Session` has
  `sub`, `email`, `role`) and `can(role, capability)` from `src/lib/rbac.ts`
  (`"content:write"` is held by ADMINISTRATOR, CLINICAL_DIRECTOR, RECEPTIONIST).
- File-streaming pattern: see `src/app/patient-portal/documents/[id]/download/route.ts`
  (`new NextResponse(new Uint8Array(bytes), { headers })`).
- `audit({ sub, email }, action, entity, entityId?, metadata?)`.

## Decisions (user-approved)

1. **Public media is served by an app route**, not a public bucket:
   `GET /api/media/[id]` streams bytes via `storage.getObject`. Works identically for R2
   and local dev; no extra infra/env.
2. **Deterministic storage key `media/<id>`** → `Media.url = /api/media/<id>`.
   **No schema/migration needed** (id is the only thing the serve route needs).
3. **Allowed uploads: jpeg/png/webp/gif only; SVG excluded** (SVG can carry scripts → XSS
   when served same-origin). Max size 5 MB.
4. **Image dimensions are computed client-side** before upload and sent as form fields
   (avoids a server-side image-parsing dependency).
5. **`Media.alt` defaults to the uploaded filename** (the model has no `fileName` column),
   so it doubles as the library label.
6. **IconPicker uses a curated, searchable Lucide set** (the prompt's required icons plus
   common extras), not all ~1500 icons, to keep bundle size and render cost down.

## Goal

Admins pick block images from a media library (or upload new ones) and pick `iconList`
icons from a visual Lucide grid — no manual URLs or icon-name typing — and TinyMCE can
upload inline images. All media is stored via the existing storage layer and served
through a cache-friendly app route.

## Scope

### In scope
1. `GET /api/media/[id]` — public, streams stored media.
2. `POST /api/admin/media/upload` — auth, validates + stores an image, creates `Media`.
3. `GET /api/admin/media` — auth, lists recent media for the library.
4. `MediaPicker` modal (Library + Upload tabs), wired into the 4 image blocks' `image.url`.
5. `IconPicker` modal (curated searchable Lucide grid), wired into `iconList` item icons.
6. Re-enable TinyMCE inline images in `RichTextEditor` (image plugin + upload handler).

### Out of scope (later / deliberately not done)
- Media management UI (rename/delete/replace, alt editing, pagination beyond a cap),
  media usage tracking → not needed for C2.
- A `fileName`/`storageKey` column, public R2 bucket, server-side image processing →
  avoided by decisions 2/4/5.
- Drag reorder, slide-over panels, autosave, list filters, SVG thumbnails → **Phase C3**.

## Design

### 1. Serve route — `src/app/api/media/[id]/route.ts` (public)

```
GET: find Media by id (404 if none) → bytes = storage.getObject(`media/${id}`)
     (404 if null) → NextResponse(bytes, {
       "Content-Type": media.mimeType,
       "Content-Length": bytes.length,
       "Cache-Control": "public, max-age=31536000, immutable",
     })
```
`export const dynamic = "force-dynamic"`. No auth — these are public marketing images.

### 2. Upload route — `src/app/api/admin/media/upload/route.ts` (auth)

```
POST (multipart):
  session = getSession(); if !session || !can(session.role,"content:write") → 401/403
  file = formData.get("file"); if not a File → 400
  if file.type not in {image/jpeg,image/png,image/webp,image/gif} → 415
  if file.size > 5*1024*1024 → 413
  width = Number(formData.get("width")) || null; height likewise  // client-computed
  buf = Buffer.from(await file.arrayBuffer())
  alt = filename without extension (from file.name)
  media = db.media.create({ data: { url: "", alt, mimeType: file.type,
            sizeBytes: file.size, width, height, uploadedById: session.sub } })
  storage.putObject(`media/${media.id}`, buf, file.type)
  media = db.media.update({ where:{id}, data:{ url: `/api/media/${media.id}` } })
  audit(session, "media.upload", "Media", media.id, { mimeType, sizeBytes })
  return NextResponse.json({ id, url, alt, mimeType, width, height, sizeBytes })
```
Returns 401 (no session) / 403 (no capability) as JSON, not a redirect.

### 3. List route — `src/app/api/admin/media/route.ts` (auth)

```
GET: session = getSession(); if !session || !can(session.role,"content:write") → 401/403
     items = db.media.findMany({ orderBy:{createdAt:"desc"}, take: 200,
       select:{ id,url,alt,mimeType,width,height,sizeBytes,createdAt } })
     return NextResponse.json({ items })
```

### 4. `MediaPicker` — `src/components/admin/MediaPicker.tsx` (client)

Props: `{ value?: string; onChange: (url: string) => void }`.
- Trigger button shows an `<img>` thumbnail of `value` (or "No image selected").
- Opens a modal (focus-trapped, Esc to close) with two tabs:
  - **Library:** `fetch("/api/admin/media")` on open; grid of thumbnails, each showing
    `alt` (label) + `width×height`; clicking calls `onChange(item.url)` and closes; the
    item matching `value` shows a checkmark.
  - **Upload:** a file input / drop zone. On file chosen, compute dimensions client-side
    (`createImageBitmap`/`Image`), POST `FormData{file,width,height}` to
    `/api/admin/media/upload`, then `onChange(data.url)` and close. Shows a spinner +
    inline error on failure (bad type/size).
- Reused by the 4 image-block forms in `PageEditor` for `image.url`; `image.alt` stays an
  editable text Field (prefilled from the picked item's alt when empty).

### 5. `IconPicker` — `src/components/admin/IconPicker.tsx` (client)

Props: `{ value?: string; onChange: (name: string) => void }`.
- A module-level `ICON_NAMES: string[]` curated list (the prompt's required set —
  `CheckCircle2, Check, Star, Heart, Shield, Clock, Users, Phone, MapPin, Calendar,
  FileText, AlertCircle, Info, ArrowRight, Zap, Award, BookOpen, Clipboard, Home,
  Activity, Smile, ThumbsUp, Lock, Unlock, Globe, Mail` — plus common extras).
- Trigger button shows the current icon (via `resolveIcon(value)`) + its name.
- Modal: a search input filters `ICON_NAMES` by substring; a 6-column grid of
  `resolveIcon(name)` cells; clicking a cell calls `onChange(name)` and closes; the
  selected cell is highlighted.
- Reused by the `iconList` item form in `PageEditor`.

### 6. TinyMCE inline images — `src/components/admin/RichTextEditor.tsx`

In full mode only: add `"image"` to the plugins array and an `image` button to the
toolbar, and add to `init`:
```ts
images_upload_handler: async (blobInfo) => {
  const fd = new FormData();
  fd.append("file", blobInfo.blob(), blobInfo.filename());
  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url; // served URL
}
```
`<img>` is already in the `sanitizeHtml` allowlist (Phase B), so uploaded inline images
render after sanitization. Minimal mode stays image-free.

## Risks / notes

- The serve route streams through the Node server. With `immutable` cache headers and
  content-addressed-by-id URLs, repeat loads are cached by the browser/CDN; fine for this
  site's traffic. (A public R2 bucket can be introduced later without changing `Media.url`
  consumers if desired.)
- SVG is intentionally unsupported; if SVG is needed later it must be sanitized before
  storage. Document this in the upload route comment.
- `RECEPTIONIST` holds `content:write`, so receptionists can upload media — consistent
  with their ability to edit page content.
- No migration; `Media` rows created by uploads use the deterministic `media/<id>` key.

## Acceptance criteria

- [ ] `GET /api/media/[id]` streams a stored image with the correct content-type and cache
      headers; 404 for unknown id.
- [ ] `POST /api/admin/media/upload` rejects non-images, SVGs, and >5 MB; stores valid
      images; returns the served URL; requires `content:write`.
- [ ] `GET /api/admin/media` lists recent media for authorized users; 401/403 otherwise.
- [ ] `MediaPicker` library + upload tabs work and set the block's `image.url`.
- [ ] `IconPicker` searches and selects a Lucide icon, setting the `iconList` item icon.
- [ ] Pickers are wired into the image blocks and `iconList` in `PageEditor`.
- [ ] TinyMCE full mode uploads inline images via the endpoint and they render sanitized.
- [ ] `npx tsc --noEmit` and `npm run build` pass.
