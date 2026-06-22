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
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/media");
        const d = await r.json();
        if (active) setItems(d.items ?? []);
      } catch {
        if (active) setError("Could not load media library.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
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
