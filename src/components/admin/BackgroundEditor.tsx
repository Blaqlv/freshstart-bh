"use client";

import type { BlockBackground, BackgroundType, GradientDirection } from "@/lib/cms/blocks";
import { MediaPicker } from "./MediaPicker";
import { OpacitySlider } from "./OpacitySlider";
import { LivePreviewBar } from "./LivePreviewBar";
import { ColorField } from "./controls";

const labelCls = "block text-xs font-medium text-ink-soft";
const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";

const TABS: { value: BackgroundType; label: string }[] = [
  { value: "color", label: "Solid Colour" },
  { value: "image", label: "Image" },
  { value: "gradient", label: "Gradient" },
];

const FOCUS_ZONES: { pos: string; row: number; col: number }[] = [
  { pos: "top left", row: 0, col: 0 },
  { pos: "top center", row: 0, col: 1 },
  { pos: "top right", row: 0, col: 2 },
  { pos: "center left", row: 1, col: 0 },
  { pos: "center center", row: 1, col: 1 },
  { pos: "center right", row: 1, col: 2 },
  { pos: "bottom left", row: 2, col: 0 },
  { pos: "bottom center", row: 2, col: 1 },
  { pos: "bottom right", row: 2, col: 2 },
];

const COMPASS: { dir: GradientDirection; glyph: string; name: string }[] = [
  { dir: "to-tl", glyph: "↖", name: "top-left" },
  { dir: "to-t", glyph: "↑", name: "top" },
  { dir: "to-tr", glyph: "↗", name: "top-right" },
  { dir: "to-l", glyph: "←", name: "left" },
  { dir: "to-r", glyph: "→", name: "right" },
  { dir: "to-bl", glyph: "↙", name: "bottom-left" },
  { dir: "to-b", glyph: "↓", name: "bottom" },
  { dir: "to-br", glyph: "↘", name: "bottom-right" },
];

export function BackgroundEditor({
  value,
  onChange,
}: {
  value: BlockBackground;
  onChange: (bg: BlockBackground) => void;
}) {
  const patch = (p: Partial<BlockBackground>) => onChange({ ...value, ...p });
  const focus = value.imageObjectPosition ?? "center center";

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      {/* Tab group */}
      <div role="tablist" aria-label="Background type" className="flex gap-1 rounded-lg border border-line p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={value.type === t.value}
            onClick={() => patch({ type: t.value })}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              value.type === t.value ? "bg-brand-dark text-white" : "text-ink hover:bg-surface-alt"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {value.type === "color" && (
        <div className="space-y-3">
          <ColorField label="Background colour" value={value.color} onChange={(v) => patch({ color: v })} defaultValue="#31585d" />
          <OpacitySlider
            label="Background opacity — lower values make it more transparent."
            value={value.colorOpacity ?? 100}
            onChange={(v) => patch({ colorOpacity: v })}
          />
        </div>
      )}

      {value.type === "image" && (
        <div className="space-y-3">
          <div>
            <span className={labelCls}>Background image</span>
            <div className="mt-1">
              <MediaPicker value={value.imageUrl ?? ""} onChange={(v) => patch({ imageUrl: v })} />
            </div>
          </div>
          <label className="block">
            <span className={labelCls}>Image alt text</span>
            <input value={value.imageAlt ?? ""} onChange={(e) => patch({ imageAlt: e.target.value })} className={input} />
          </label>

          <div>
            <span className={labelCls}>Click to set the focal point of the image.</span>
            <div
              className="relative mt-1 h-28 w-full max-w-xs overflow-hidden rounded-lg border border-line bg-surface-alt"
              style={
                value.imageUrl
                  ? { backgroundImage: `url(${value.imageUrl})`, backgroundSize: "cover", backgroundPosition: focus }
                  : undefined
              }
            >
              <div className="grid h-full w-full grid-cols-3 grid-rows-3">
                {FOCUS_ZONES.map((z) => (
                  <button
                    key={z.pos}
                    type="button"
                    aria-label={`Focus: ${z.pos}`}
                    aria-pressed={focus === z.pos}
                    onClick={() => patch({ imageObjectPosition: z.pos })}
                    className={`border border-white/30 transition ${
                      focus === z.pos ? "bg-brand-dark/50" : "hover:bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <ColorField label="Overlay colour" value={value.overlayColor} onChange={(v) => patch({ overlayColor: v })} defaultValue="#000000" />
          <OpacitySlider
            label="Overlay opacity (0% = full image, 100% = covered). Typical: 30–60%."
            value={value.overlayOpacity ?? 40}
            onChange={(v) => patch({ overlayOpacity: v })}
          />
        </div>
      )}

      {value.type === "gradient" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Start colour" value={value.gradientFrom} onChange={(v) => patch({ gradientFrom: v })} defaultValue="#31585d" />
            <ColorField label="End colour" value={value.gradientTo} onChange={(v) => patch({ gradientTo: v })} defaultValue="#4ba5aa" />
          </div>
          <div>
            <span className={labelCls}>Direction</span>
            <div className="mt-1 grid w-[120px] grid-cols-3 grid-rows-3 gap-1">
              {/* row 1 */}
              <CompassBtn d="to-tl" value={value} patch={patch} />
              <CompassBtn d="to-t" value={value} patch={patch} />
              <CompassBtn d="to-tr" value={value} patch={patch} />
              {/* row 2 */}
              <CompassBtn d="to-l" value={value} patch={patch} />
              <span aria-hidden="true" />
              <CompassBtn d="to-r" value={value} patch={patch} />
              {/* row 3 */}
              <CompassBtn d="to-bl" value={value} patch={patch} />
              <CompassBtn d="to-b" value={value} patch={patch} />
              <CompassBtn d="to-br" value={value} patch={patch} />
            </div>
          </div>
          <OpacitySlider label="Gradient opacity" value={value.gradientOpacity ?? 100} onChange={(v) => patch({ gradientOpacity: v })} />
        </div>
      )}

      <div>
        <span className={labelCls}>Live preview</span>
        <div className="mt-1">
          <LivePreviewBar background={value} />
        </div>
      </div>
    </div>
  );
}

function CompassBtn({
  d,
  value,
  patch,
}: {
  d: GradientDirection;
  value: BlockBackground;
  patch: (p: Partial<BlockBackground>) => void;
}) {
  const meta = COMPASS.find((c) => c.dir === d)!;
  const active = (value.gradientDirection ?? "to-br") === d;
  return (
    <button
      type="button"
      aria-label={`Gradient direction: ${meta.name}`}
      aria-pressed={active}
      onClick={() => patch({ gradientDirection: d })}
      className={`flex h-9 w-9 items-center justify-center rounded border text-sm ${
        active ? "border-brand-dark bg-brand-dark text-white" : "border-line text-ink hover:bg-surface-alt"
      }`}
    >
      {meta.glyph}
    </button>
  );
}
