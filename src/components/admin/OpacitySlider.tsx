"use client";

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0);

/** Range + numeric input for a 0–100 opacity value, kept in sync bidirectionally. */
export function OpacitySlider({
  value,
  onChange,
  label,
  trackColor = "#31585d",
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  trackColor?: string;
}) {
  return (
    <div>
      {label && <span className="block text-xs font-medium text-ink-soft">{label}</span>}
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          aria-label={label ?? "Opacity"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          className="h-2 flex-1 cursor-pointer rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${trackColor})` }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          onBlur={(e) => onChange(clamp(Number(e.target.value)))}
          aria-label={`${label ?? "Opacity"} percentage`}
          className="w-16 rounded-lg border border-line px-2 py-1 text-sm"
        />
        <span aria-hidden="true" className="text-sm text-ink-soft">%</span>
      </div>
    </div>
  );
}
