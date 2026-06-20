import type { MonthlyPoint } from "@/lib/dashboard";

/** Pure-CSS bar chart — no charting dependency for launch. */
export function MiniBars({ data, label }: { data: MonthlyPoint[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <div className="mt-3 flex items-end gap-2" style={{ height: 120 }} role="img" aria-label={`${label} over the last 6 months`}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold text-brand-dark">{d.value}</span>
            <div
              className="w-full rounded-t bg-brand"
              style={{ height: `${Math.round((d.value / max) * 96)}%`, minHeight: d.value > 0 ? 4 : 1 }}
            />
            <span className="text-[10px] text-ink-soft">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
