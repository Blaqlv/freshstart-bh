"use client";
import { useState } from "react";

export function ClinicalNoteModal({ noteId, title }: { noteId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function load() {
    setOpen(true);
    setError(false);
    setHtml(null);
    try {
      const res = await fetch(`/patient-portal/health/note/${noteId}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setHtml(await res.text());
    } catch {
      setError(true);
    }
  }

  function printNote() {
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title></head><body>${html ?? ""}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <>
      <button onClick={load} className="mt-2 text-sm text-accent hover:underline">
        View note
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-card bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-soft">
                ✕
              </button>
            </div>
            {error ? (
              <p className="text-sm text-amber-900">This note is unavailable right now.</p>
            ) : html === null ? (
              <p className="text-sm text-ink-soft">Loading…</p>
            ) : (
              <div
                className="prose prose-sm max-w-none"
                // Content is sanitized server-side (sanitizeHtml) before it reaches here.
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={printNote}
                disabled={!html}
                className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Download as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
