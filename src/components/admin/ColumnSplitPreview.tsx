import { COLUMN_SPLITS, type ColumnSplit } from "@/lib/cms/blocks";

/** Proportional bar diagram of a column split, used in the split-picker tiles. */
export function ColumnSplitPreview({
  split,
  width = 80,
  height = 40,
}: {
  split: ColumnSplit;
  width?: number;
  height?: number;
}) {
  const ratios = COLUMN_SPLITS.find((s) => s.value === split)?.ratios ?? [1, 1];
  const total = ratios.reduce((a, b) => a + b, 0);
  const gap = 2;
  const innerW = width - gap * (ratios.length - 1);

  // Precompute each bar's [x, width] so nothing is mutated during render.
  const bars = ratios.reduce<{ x: number; w: number }[]>((acc, r) => {
    const w = (r / total) * innerW;
    const x = acc.length ? acc[acc.length - 1].x + acc[acc.length - 1].w + gap : 0;
    acc.push({ x, w });
    return acc;
  }, []);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true" className="text-brand-dark">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} rx={3} fill="currentColor" opacity={0.7} />
      ))}
    </svg>
  );
}
