import { ImageResponse } from "next/og";

/**
 * Default Open Graph / social share image (B1). As a root-level file-based
 * metadata image, Next applies this as og:image for every route that doesn't
 * provide its own — no static asset to maintain.
 */
export const alt = "Fresh Start Behavioral Health";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#000068",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
          Fresh Start Behavioral Health
        </div>
        <div style={{ marginTop: 24, fontSize: 34, color: "#ffdd00" }}>
          Everyone Deserves a Fresh Start
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "rgba(255,255,255,0.85)" }}>
          Dayton · Cincinnati · Milford, OH
        </div>
      </div>
    ),
    { ...size },
  );
}
