import type { CSSProperties } from "react";
import { Container } from "@/components/ui/Container";
import type { HorizontalDividerBlock as HorizontalDividerBlockType } from "@/lib/cms/blocks";

const spacingMap: Record<string, string> = {
  xs: "1rem",
  sm: "1.5rem",
  md: "2.5rem",
  lg: "4rem",
  xl: "6rem",
  "2xl": "8rem",
};

const widthMap: Record<string, string> = {
  full: "100%",
  "3/4": "75%",
  "1/2": "50%",
  "1/4": "25%",
};

const labelSizeMap: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
};

export function HorizontalDividerBlock({ block }: { block: HorizontalDividerBlockType }) {
  const paddingTop = spacingMap[block.spacingTop ?? "md"];
  const paddingBottom = spacingMap[block.spacingBottom ?? "md"];
  const lineWidth = widthMap[block.width ?? "full"];
  const align = block.align ?? "center";

  const border = `${block.thickness ?? 1}px ${block.style ?? "solid"} ${block.color ?? "currentColor"}`;

  const lineStyle: CSSProperties = {
    width: lineWidth,
    borderTop: border,
    opacity: 0.4,
    ...(align === "left"
      ? { marginRight: "auto" }
      : align === "right"
        ? { marginLeft: "auto" }
        : { marginLeft: "auto", marginRight: "auto" }),
  };

  return (
    <Container>
      <div style={{ paddingTop, paddingBottom }}>
        {block.label ? (
          <div className="flex items-center gap-4 text-ink-soft">
            <span style={{ borderTop: border, opacity: 0.4, flex: 1 }} aria-hidden="true" />
            <span className={`${labelSizeMap[block.labelSize ?? "sm"]} font-medium whitespace-nowrap`}>
              {block.label}
            </span>
            <span style={{ borderTop: border, opacity: 0.4, flex: 1 }} aria-hidden="true" />
          </div>
        ) : (
          <div style={lineStyle} role="separator" />
        )}
      </div>
    </Container>
  );
}
