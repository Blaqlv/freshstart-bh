"use client";

import { createElement, useState } from "react";
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
  const filtered = ICON_NAMES.filter((n) => n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-brand-dark"
      >
        {createElement(resolveIcon(value ?? ""), { className: "h-4 w-4", "aria-hidden": true })}
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
