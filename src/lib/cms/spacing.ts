// src/lib/cms/spacing.ts
import type { BlockType } from "./blocks";

/** Admin-facing vertical spacing scale (wrapper padding around a block). */
export type BlockSpacing = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export const spacingPxMap: Record<BlockSpacing, number> = {
  none: 0,
  xs: 8,
  sm: 16,
  md: 32,
  lg: 56,
  xl: 80,
  xxl: 120,
};

export const spacingLabelMap: Record<BlockSpacing, string> = {
  none: "None",
  xs: "XS (8px)",
  sm: "Small (16px)",
  md: "Medium (32px)",
  lg: "Large (56px)",
  xl: "XL (80px)",
  xxl: "XXL (120px)",
};

export function spacingToPx(value: BlockSpacing | undefined): number {
  return value ? spacingPxMap[value] : 0;
}

/** Blocks that own a colored background — keep their internal padding, never flush. */
const BANDED_BLOCK_TYPES = new Set<BlockType>([
  "hero",
  "ctaBanner",
  "testimonialCarousel",
  "teamGrid",
]);

/** Blocks with purpose-built spacing config — the wrapper never touches them. */
const NO_WRAPPER_SPACING = new Set<BlockType>(["verticalSpacer", "horizontalDivider"]);

/** Legacy outer vertical padding (px per side) for plain blocks, used as the
 *  fallback for a side left unset so a half-configured block never collapses. */
const LEGACY_PLAIN_PX: Partial<Record<BlockType, number>> = { columnLayout: 32 };
const DEFAULT_PLAIN_PX = 48; // py-12

export type ResolvedSpacing = {
  /** True when the wrapper is the source of vertical padding (plain, opted-in). */
  managed: boolean;
  /** True when the block component must drop its own outer vertical padding. */
  flush: boolean;
  paddingTop: number;
  paddingBottom: number;
};

/** Pure decision for how a block participates in wrapper spacing. */
export function resolveBlockSpacing(block: {
  type: BlockType;
  spaceAbove?: BlockSpacing;
  spaceBelow?: BlockSpacing;
}): ResolvedSpacing {
  const { type, spaceAbove: top, spaceBelow: bottom } = block;

  if (NO_WRAPPER_SPACING.has(type)) {
    return { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 };
  }

  if (BANDED_BLOCK_TYPES.has(type)) {
    // Band keeps internal padding; wrapper adds an external gap only when set.
    return {
      managed: false,
      flush: false,
      paddingTop: spacingToPx(top),
      paddingBottom: spacingToPx(bottom),
    };
  }

  const hasSpacing = top !== undefined || bottom !== undefined;
  if (!hasSpacing) {
    return { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 };
  }

  const legacy = LEGACY_PLAIN_PX[type] ?? DEFAULT_PLAIN_PX;
  return {
    managed: true,
    flush: true,
    paddingTop: top !== undefined ? spacingToPx(top) : legacy,
    paddingBottom: bottom !== undefined ? spacingToPx(bottom) : legacy,
  };
}
