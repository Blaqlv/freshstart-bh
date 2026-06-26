"use client";

import { resolveBackground } from "@/lib/cms/background";
import type { BlockBackground } from "@/lib/cms/blocks";

// Checkerboard so partial transparency is visible behind the preview.
const checker: React.CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

/** Real-time preview of a BlockBackground, used in the hero/CTA editor forms. */
export function LivePreviewBar({ background, height = 80 }: { background: BlockBackground; height?: number }) {
  if (background.type === "image" && !background.imageUrl) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-line bg-surface-alt text-xs text-ink-soft"
      >
        Select an image above to preview.
      </div>
    );
  }

  const { wrapperStyle, overlayStyle, hasOverlay } = resolveBackground(background);
  return (
    <div className="rounded-lg border border-line" style={{ ...checker, height }}>
      <div className="relative h-full w-full overflow-hidden rounded-lg" style={wrapperStyle}>
        {hasOverlay && <div style={overlayStyle} />}
      </div>
    </div>
  );
}
