import type { VerticalSpacerBlock as VerticalSpacerBlockType } from "@/lib/cms/blocks";

const sizeMap: Record<string, string> = {
  xs: "h-4", // 16px
  sm: "h-6", // 24px
  md: "h-10", // 40px
  lg: "h-16", // 64px
  xl: "h-24", // 96px
  "2xl": "h-32", // 128px
};

export function VerticalSpacerBlock({ block }: { block: VerticalSpacerBlockType }) {
  if (block.size === "custom" && block.customPx) {
    const px = Math.min(400, Math.max(4, block.customPx));
    return <div style={{ height: `${px}px` }} aria-hidden="true" />;
  }
  return <div className={sizeMap[block.size] ?? sizeMap.md} aria-hidden="true" />;
}
