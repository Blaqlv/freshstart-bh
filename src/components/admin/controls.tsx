"use client";

import type { ReactNode } from "react";

const labelCls = "block text-xs font-medium text-ink-soft";

/** Segmented button group — a visual alternative to a radio list. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      {label && <span className={labelCls}>{label}</span>}
      <div className="mt-1 inline-flex flex-wrap gap-1 rounded-lg border border-line p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              value === o.value ? "bg-brand-dark text-white" : "text-ink hover:bg-surface-alt"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function normalizeHex(v: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : /^#[0-9a-fA-F]{6}$/.test(fallback) ? fallback : "#000000";
}

/** Colour picker swatch + hex text input. */
export function ColorField({
  label,
  value,
  onChange,
  defaultValue = "#31585d",
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  defaultValue?: string;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(value ?? "", defaultValue)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour swatch`}
          className="h-9 w-12 cursor-pointer rounded border border-line"
        />
        <input
          type="text"
          value={value ?? ""}
          placeholder={defaultValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
          className="w-28 rounded-lg border border-line px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}
