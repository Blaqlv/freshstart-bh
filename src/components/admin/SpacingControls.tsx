"use client";

import { SegmentedControl } from "./controls";
import { type BlockSpacing, spacingPxMap } from "@/lib/cms/spacing";

const OPTIONS: { value: BlockSpacing; label: string }[] = [
  { value: "none", label: "None" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "SM" },
  { value: "md", label: "MD" },
  { value: "lg", label: "LG" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
];

/**
 * Two segmented controls (Space Above / Below) with a live px readout. Selecting
 * any value — including "None" — opts the block into wrapper-managed spacing and
 * suppresses its built-in padding. Leaving both untouched keeps legacy spacing.
 */
export function SpacingControls({
  spaceAbove,
  spaceBelow,
  onChange,
}: {
  spaceAbove?: BlockSpacing;
  spaceBelow?: BlockSpacing;
  onChange: (patch: { spaceAbove?: BlockSpacing; spaceBelow?: BlockSpacing }) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <SegmentedControl
          label="Space above"
          value={spaceAbove ?? "none"}
          options={OPTIONS}
          onChange={(v) => onChange({ spaceAbove: v })}
        />
        <p className="mt-1 text-xs text-ink-soft">{spacingPxMap[spaceAbove ?? "none"]}px</p>
      </div>
      <div>
        <SegmentedControl
          label="Space below"
          value={spaceBelow ?? "none"}
          options={OPTIONS}
          onChange={(v) => onChange({ spaceBelow: v })}
        />
        <p className="mt-1 text-xs text-ink-soft">{spacingPxMap[spaceBelow ?? "none"]}px</p>
      </div>
    </div>
  );
}
