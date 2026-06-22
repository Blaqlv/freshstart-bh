# Phase C2 — Media & Icon Pickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a media library + uploader and a visual Lucide icon picker for block fields, served through a cache-friendly app route, and re-enable TinyMCE inline image upload.

**Architecture:** Three API routes back the media library — a public `GET /api/media/[id]` that streams stored bytes via `storage.getObject` (deterministic key `media/<id>`, so no schema change), and auth-gated `POST /api/admin/media/upload` + `GET /api/admin/media`. Client `MediaPicker` and `IconPicker` modals replace C1's plain image-URL and icon-name inputs in `PageEditor`. `RichTextEditor` regains an image button wired to the upload endpoint.

**Tech Stack:** Next.js 16 route handlers (RSC), React 19, Prisma 6 `Media` model, `src/lib/storage.ts` (R2 / local `.uploads` fallback), `lucide-react`, Phase B `RichTextEditor`.

**Depends on:** Phase A/B/C1. This branch (`prompt-6-phase-c2-media-icon-pickers`) is stacked on the C1 branch.

**Testing note:** No unit-test runner. Per-task verification is `npx tsc --noEmit`; the final task runs `npm run build`, lint, and an automated public serve-route check (seeds a Media row + local file, curls `/api/media/<id>`). The auth-gated upload/list endpoints and the picker UIs are a human follow-up.

**Conventions:** API auth via `getSession()` + `can(session.role, "content:write")` returning JSON 401/403 (see `src/lib/rbac.ts`); file streaming via `new NextResponse(new Uint8Array(bytes), { headers })` (see `src/app/patient-portal/documents/[id]/download/route.ts`); `audit({ sub, email }, action, entity, id, meta)`. Commit per task with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` footer.

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `src/app/api/media/[id]/route.ts` | Public: stream a stored media file | Create |
| `src/app/api/admin/media/upload/route.ts` | Auth: validate + store an image, create `Media` | Create |
| `src/app/api/admin/media/route.ts` | Auth: list recent media | Create |
| `src/components/admin/MediaPicker.tsx` | Library + upload modal | Create |
| `src/components/admin/IconPicker.tsx` | Searchable Lucide grid modal | Create |
| `src/components/admin/PageEditor.tsx` | Swap image/icon Fields for the pickers | Modify |
| `src/components/admin/RichTextEditor.tsx` | Re-enable inline image upload | Modify |

---

## Task 1: Public media serve route

**Files:** Create `src/app/api/media/[id]/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Public: stream a CMS media file by id (stored at key `media/<id>`). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await getObject(`media/${id}`);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/media/[id]/route.ts"
git commit -m "$(cat <<'EOF'
Add public media serve route streaming stored files

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Media upload route

**Files:** Create `src/app/api/admin/media/upload/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { putObject } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Raster images only. SVG is excluded: it can carry scripts and would be an XSS
// vector when served same-origin. If SVG is needed later, sanitize before storing.
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "content:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  const width = Number(form.get("width")) || null; // client-computed dimensions
  const height = Number(form.get("height")) || null;
  const alt = file.name.replace(/\.[^.]+$/, ""); // filename doubles as the library label
  const buf = Buffer.from(await file.arrayBuffer());

  const media = await db.media.create({
    data: {
      url: "",
      alt,
      mimeType: file.type,
      sizeBytes: file.size,
      width,
      height,
      uploadedById: session.sub,
    },
  });
  await putObject(`media/${media.id}`, buf, file.type);
  const updated = await db.media.update({
    where: { id: media.id },
    data: { url: `/api/media/${media.id}` },
  });

  await audit({ sub: session.sub, email: session.email }, "media.upload", "Media", media.id, {
    mimeType: file.type,
    sizeBytes: file.size,
  });

  return NextResponse.json({
    id: updated.id,
    url: updated.url,
    alt: updated.alt,
    mimeType: updated.mimeType,
    width: updated.width,
    height: updated.height,
    sizeBytes: updated.sizeBytes,
  });
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/media/upload/route.ts
git commit -m "$(cat <<'EOF'
Add authenticated media upload endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Media list route

**Files:** Create `src/app/api/admin/media/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "content:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      url: true,
      alt: true,
      mimeType: true,
      width: true,
      height: true,
      sizeBytes: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ items });
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/media/route.ts
git commit -m "$(cat <<'EOF'
Add authenticated media list endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: MediaPicker component

**Files:** Create `src/components/admin/MediaPicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";

type MediaItem = {
  id: string;
  url: string;
  alt: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
};

async function imageDimensions(file: File): Promise<{ w: number; h: number } | null> {
  try {
    const bmp = await createImageBitmap(file);
    const dims = { w: bmp.width, h: bmp.height };
    bmp.close();
    return dims;
  } catch {
    return null;
  }
}

export function MediaPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tab !== "library") return;
    setLoading(true);
    setError(null);
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setError("Could not load media library."))
      .finally(() => setLoading(false));
  }, [open, tab]);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const dims = await imageDimensions(file);
      const fd = new FormData();
      fd.append("file", file);
      if (dims) {
        fd.append("width", String(dims.w));
        fd.append("height", String(dims.h));
      }
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Upload failed");
      }
      const d = await res.json();
      onChange(d.url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const tabCls = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium ${active ? "bg-brand-dark text-white" : "text-ink hover:bg-surface-alt"}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-brand-dark"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-12 w-12 rounded object-cover" />
        ) : (
          "No image selected"
        )}
        <span className="text-brand-dark">Choose…</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Media picker"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-card bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button type="button" className={tabCls(tab === "library")} onClick={() => setTab("library")}>
                  Media library
                </button>
                <button type="button" className={tabCls(tab === "upload")} onClick={() => setTab("upload")}>
                  Upload new
                </button>
              </div>
              <button type="button" aria-label="Close" className="rounded p-1 hover:bg-surface-alt" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-accent">{error}</p>}

            {tab === "library" ? (
              loading ? (
                <p className="mt-4 text-sm text-ink-soft">Loading…</p>
              ) : items.length === 0 ? (
                <p className="mt-4 text-sm text-ink-soft">No media uploaded yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {items.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange(m.url);
                        setOpen(false);
                      }}
                      className="relative rounded border border-line p-1 text-left hover:border-brand-dark"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.alt} className="aspect-square w-full rounded object-cover" />
                      {value === m.url && (
                        <span className="absolute right-1 top-1 rounded-full bg-brand-dark px-1.5 text-xs text-white">✓</span>
                      )}
                      <span className="mt-1 block truncate text-xs text-ink-soft">
                        {m.alt}
                        {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="mt-4">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={loading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="block w-full text-sm"
                />
                <p className="mt-2 text-xs text-ink-soft">JPEG, PNG, WebP, or GIF. Max 5MB.</p>
                {loading && <p className="mt-2 text-sm text-ink-soft">Uploading…</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/MediaPicker.tsx
git commit -m "$(cat <<'EOF'
Add MediaPicker modal (library + upload tabs)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: IconPicker component

**Files:** Create `src/components/admin/IconPicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { resolveIcon } from "@/lib/cms/resolveIcon";

// Curated, searchable set (the prompt's required icons + common care-domain extras).
// Kept finite so we don't import all ~1500 Lucide icons into the bundle.
const ICON_NAMES = [
  "CheckCircle2", "Check", "Star", "Heart", "Shield", "Clock", "Users", "Phone",
  "MapPin", "Calendar", "FileText", "AlertCircle", "Info", "ArrowRight", "Zap",
  "Award", "BookOpen", "Clipboard", "Home", "Activity", "Smile", "ThumbsUp",
  "Lock", "Unlock", "Globe", "Mail", "Stethoscope", "Brain", "HandHeart", "Pill",
  "Hospital", "UserCheck", "MessageCircle", "Sparkles", "Target", "Compass",
  "LifeBuoy", "Leaf", "Sun", "Moon",
];

export function IconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const Current = resolveIcon(value ?? "");
  const filtered = ICON_NAMES.filter((n) => n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-brand-dark"
      >
        <Current className="h-4 w-4" aria-hidden />
        {value || "Choose icon"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Icon picker"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-card bg-white p-6">
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search icons…"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
              />
              <button type="button" aria-label="Close" className="rounded p-1 hover:bg-surface-alt" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
              {filtered.map((name) => {
                const Icon = resolveIcon(name);
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded border ${
                      value === name ? "border-brand-dark bg-brand-tint" : "border-line hover:bg-surface-alt"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && <p className="mt-4 text-sm text-ink-soft">No icons match.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/IconPicker.tsx
git commit -m "$(cat <<'EOF'
Add IconPicker modal with a curated searchable Lucide grid

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire pickers into PageEditor

**Files:** Modify `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Import the pickers**

After the existing `import { RichTextEditor } from "./RichTextEditor";` line, add:

```tsx
import { MediaPicker } from "./MediaPicker";
import { IconPicker } from "./IconPicker";
```

- [ ] **Step 2: Add labeled wrapper helpers**

Next to the existing `Field`/`RichField`/`Radio`/`Toggle` helpers at the bottom of the file, add:

```tsx
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">
        <MediaPicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function IconField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">
        <IconPicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Swap the iconList icon field for IconField**

In the `iconList` case, replace:
```tsx
              <Field label="Icon (Lucide name, e.g. CheckCircle2)" value={it.icon} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, icon: v } : x)) } as Partial<Block>)} />
```
with:
```tsx
              <IconField label="Icon" value={it.icon} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, icon: v } : x)) } as Partial<Block>)} />
```

- [ ] **Step 4: Swap the image-URL fields for ImageField (3 identical occurrences)**

The image blocks use this exact line in three places (the shared `imageLeftTextRight`/`imageRightTextLeft` case, `imageTitleBelow`, and `imageTitleBeside`):
```tsx
          <Field label="Image URL" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
```
Replace **all three** occurrences with:
```tsx
          <ImageField label="Image" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
```
(The "Image alt text" `Field` directly below each stays unchanged.)

After editing, confirm none remain:
Run: `grep -n 'label="Image URL"' src/components/admin/PageEditor.tsx`
Expected: no output.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "$(cat <<'EOF'
Wire MediaPicker and IconPicker into block edit forms

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Re-enable TinyMCE inline image upload

**Files:** Modify `src/components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Add the image plugin and toolbar button**

Replace the `FULL_TOOLBAR` constant:
```tsx
const FULL_TOOLBAR =
  "undo redo | styles | bold italic underline strikethrough | " +
  "alignleft aligncenter alignright | bullist numlist outdent indent | " +
  "link | forecolor backcolor removeformat | code fullscreen";
```
with (adds `image` after `link`):
```tsx
const FULL_TOOLBAR =
  "undo redo | styles | bold italic underline strikethrough | " +
  "alignleft aligncenter alignright | bullist numlist outdent indent | " +
  "link image | forecolor backcolor removeformat | code fullscreen";
```

Replace the `FULL_PLUGINS` constant:
```tsx
const FULL_PLUGINS = [
  "advlist", "autolink", "lists", "link", "charmap",
  "searchreplace", "visualblocks", "code", "fullscreen", "wordcount",
];
```
with (adds `image`):
```tsx
const FULL_PLUGINS = [
  "advlist", "autolink", "lists", "link", "image", "charmap",
  "searchreplace", "visualblocks", "code", "fullscreen", "wordcount",
];
```

- [ ] **Step 2: Add the upload handler to `init`**

In the `init={{ ... }}` object, add this property (after the `content_style` property):

```tsx
        images_upload_handler: async (blobInfo) => {
          const fd = new FormData();
          fd.append("file", blobInfo.blob(), blobInfo.filename());
          const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          return data.url as string;
        },
```

(Inline images only appear in full mode; minimal mode keeps the `["lists", "link"]` plugins. `<img>` is already in the Phase B `sanitizeHtml` allowlist, so uploaded images render after sanitization.)

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/RichTextEditor.tsx
git commit -m "$(cat <<'EOF'
Re-enable TinyMCE inline image upload via the media endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Verification

**Files:** none modified (verification + throwaway seed).

- [ ] **Step 1: Lint the new/changed files**

Run: `npx eslint "src/app/api/media/[id]/route.ts" src/app/api/admin/media/upload/route.ts src/app/api/admin/media/route.ts src/components/admin/MediaPicker.tsx src/components/admin/IconPicker.tsx src/components/admin/PageEditor.tsx src/components/admin/RichTextEditor.tsx`
Expected: no errors (warnings acceptable). Fix any errors before continuing.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 3: Public serve-route check (local storage backend)**

This seeds a `Media` row + a local file (the dev default when `R2_*` is not configured, which writes to `.uploads/`), then verifies the public route streams it. Create `scripts/_seed-media.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";

const db = new PrismaClient();
// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/UmKAAAAAElFTkSuQmCC",
  "base64",
);

async function main() {
  const m = await db.media.create({
    data: { url: "", alt: "seed-test", mimeType: "image/png", sizeBytes: PNG.length, width: 1, height: 1 },
  });
  const dir = path.join(process.cwd(), ".uploads", "media");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, m.id), PNG);
  await db.media.update({ where: { id: m.id }, data: { url: `/api/media/${m.id}` } });
  console.log("MEDIA_ID=" + m.id);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

Run: `npx tsx scripts/_seed-media.ts`
Expected: prints `MEDIA_ID=<id>`.

Start the dev server in the background, then (substitute the id printed above):
```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/api/media/<MEDIA_ID>
```
Expected: `200 image/png`.

Also confirm the auth gate: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/media`
Expected: `401` (no session).

- [ ] **Step 4: Clean up**

```bash
npx tsx -e "import('@prisma/client').then(async ({PrismaClient})=>{const d=new PrismaClient();await d.media.deleteMany({where:{alt:'seed-test'}});process.exit(0)})"
rm -f scripts/_seed-media.ts
```
Remove the seeded local file (`.uploads/media/<MEDIA_ID>`). Stop the dev server. Confirm `git status --short` shows no demo artifacts.

- [ ] **Step 5: Human verification note (not a code step)**

The upload endpoint and pickers are auth-gated, so verify in the admin UI: log in to `/admin`, open a page, on an image block click the MediaPicker → upload a JPEG/PNG (confirm it appears and is selected) and re-open to pick it from the library; on an `iconList` item open the IconPicker, search, and select an icon; in a richText block use the TinyMCE image button to upload an inline image. View the published page and confirm the image and icon render. (No commit; report as a manual follow-up.)

---

## Self-review

**Spec coverage:**
- `GET /api/media/[id]` public serve → Task 1. ✔
- `POST /api/admin/media/upload` (auth, type/size validation, SVG excluded, client dims, alt=filename) → Task 2. ✔
- `GET /api/admin/media` list (auth) → Task 3. ✔
- `MediaPicker` (library + upload tabs) → Task 4. ✔
- `IconPicker` (curated searchable grid) → Task 5. ✔
- Wire pickers into the 4 image blocks + iconList → Task 6. ✔
- TinyMCE inline images → Task 7. ✔
- Verification (serve check + auth gate + manual UI) → Task 8. ✔
- Out of scope (media mgmt UI, fileName/storageKey column, public bucket, dnd/slide-overs/autosave/filters) → correctly absent. ✔

**Placeholder scan:** No TBD/TODO; every code step has full code and exact commands. ✔

**Type consistency:** `MediaPicker({ value?, onChange:(url)=>void })` and `IconPicker({ value?, onChange:(name)=>void })` are consumed by `ImageField`/`IconField` (each `{label,value,onChange:(v:string)=>void}`), which the block forms call with `block.image.url` / `it.icon`. Upload returns `{ id,url,alt,mimeType,width,height,sizeBytes }`, matching `MediaItem` and the list `select`. Storage key `media/<id>` is identical in Task 1 (read), Task 2 (write), and Task 8 (seed). Auth uses `getSession()` + `can(role,"content:write")` consistently. ✔
