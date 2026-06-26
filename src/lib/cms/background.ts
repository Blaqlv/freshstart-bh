import type { CSSProperties } from "react";
import type { BlockBackground } from "./blocks";

export type BackgroundStyles = {
  wrapperStyle: CSSProperties; // applied to the outer section element
  overlayStyle: CSSProperties; // applied to an absolutely-positioned overlay div
  hasOverlay: boolean; // true when an overlay div should be rendered
};

const DIRECTION_MAP: Record<string, string> = {
  "to-r": "to right",
  "to-l": "to left",
  "to-b": "to bottom",
  "to-t": "to top",
  "to-br": "to bottom right",
  "to-bl": "to bottom left",
  "to-tr": "to top right",
  "to-tl": "to top left",
};

/**
 * Converts a BlockBackground config into inline styles. Shared by HeroBlock and
 * CtaBannerBlock (rendering) and the admin LivePreviewBar (real-time preview),
 * so the visual is identical everywhere.
 */
export function resolveBackground(bg: BlockBackground): BackgroundStyles {
  const baseWrapper: CSSProperties = { position: "relative", overflow: "hidden" };

  if (bg.type === "color") {
    const opacity = (bg.colorOpacity ?? 100) / 100;
    const color = applyOpacityToColor(bg.color ?? "#1a3a5c", opacity);
    return {
      wrapperStyle: { ...baseWrapper, backgroundColor: color },
      overlayStyle: {},
      hasOverlay: false,
    };
  }

  if (bg.type === "image") {
    return {
      wrapperStyle: {
        ...baseWrapper,
        backgroundImage: bg.imageUrl ? `url(${bg.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: bg.imageObjectPosition ?? "center center",
        backgroundRepeat: "no-repeat",
      },
      overlayStyle: {
        position: "absolute",
        inset: 0,
        backgroundColor: bg.overlayColor ?? "#000000",
        opacity: (bg.overlayOpacity ?? 40) / 100,
        pointerEvents: "none",
      },
      hasOverlay: true,
    };
  }

  if (bg.type === "gradient") {
    const direction = DIRECTION_MAP[bg.gradientDirection ?? "to-br"] ?? "to bottom right";
    const opacity = (bg.gradientOpacity ?? 100) / 100;
    return {
      wrapperStyle: {
        ...baseWrapper,
        backgroundImage: `linear-gradient(${direction}, ${bg.gradientFrom ?? "#1a3a5c"}, ${bg.gradientTo ?? "#2a6bcc"})`,
        opacity,
      },
      overlayStyle: {},
      hasOverlay: false,
    };
  }

  return { wrapperStyle: baseWrapper, overlayStyle: {}, hasOverlay: false };
}

/**
 * Converts a hex colour + 0–1 opacity to an rgba() string. Returns the original
 * value untouched when opacity is 1 or the input is not a 6-digit hex.
 */
export function applyOpacityToColor(hex: string, opacity: number): string {
  if (opacity >= 1) return hex;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
