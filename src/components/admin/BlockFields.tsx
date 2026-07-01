"use client";

import { useState } from "react";
import {
  type Block,
  type BlockType,
  type BlockBackground,
  type ColumnLayoutBlock,
  type ColumnSplit,
  blockRegistry,
  blockLabel,
  COLUMN_SPLITS,
  columnCountForSplit,
  columnPercentages,
} from "@/lib/cms/blocks";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPicker } from "./MediaPicker";
import { IconPicker } from "./IconPicker";
import { SegmentedControl, ColorField } from "./controls";
import { BackgroundEditor } from "./BackgroundEditor";
import { ColumnSplitPreview } from "./ColumnSplitPreview";
import { ServiceSlugPicker } from "./ServiceSlugPicker";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-xs font-medium text-ink-soft";

const SPACER_PX: Record<string, number> = { xs: 16, sm: 24, md: 40, lg: 64, xl: 96, "2xl": 128 };
const sizeOptions = (["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((v) => ({ value: v, label: v.toUpperCase() }));

export function BlockFields({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  switch (block.type) {
    case "hero":
      return (
        <>
          <Field label="Eyebrow" value={block.eyebrow ?? ""} onChange={(v) => onChange({ eyebrow: v } as Partial<Block>)} />
          <Field label="Heading" value={block.heading} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body ?? ""} onChange={(v) => onChange({ body: v } as Partial<Block>)} minimal />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA label" value={block.primaryCtaLabel ?? ""} onChange={(v) => onChange({ primaryCtaLabel: v } as Partial<Block>)} />
            <Field label="CTA link" value={block.primaryCtaHref ?? ""} onChange={(v) => onChange({ primaryCtaHref: v } as Partial<Block>)} />
          </div>
          <SegmentedControl
            label="Minimum height"
            value={block.minHeight ?? "md"}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "full", label: "Full screen" },
            ]}
            onChange={(v) => onChange({ minHeight: v } as Partial<Block>)}
          />
          <SegmentedControl
            label="Text alignment"
            value={block.textAlign ?? "left"}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => onChange({ textAlign: v } as Partial<Block>)}
          />
          <ColorField label="Text colour" value={block.textColor} onChange={(v) => onChange({ textColor: v } as Partial<Block>)} defaultValue="#ffffff" />
          <BackgroundControls background={block.background} onChange={(bg) => onChange({ background: bg } as Partial<Block>)} />
        </>
      );
    case "richText":
      return (
        <>
          <Field label="Heading" value={block.heading ?? ""} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
        </>
      );
    case "ctaBanner":
      return (
        <>
          <Field label="Heading" value={block.heading} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body ?? ""} onChange={(v) => onChange({ body: v } as Partial<Block>)} minimal />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary button label" value={block.ctaLabel ?? ""} onChange={(v) => onChange({ ctaLabel: v } as Partial<Block>)} />
            <Field label="Primary button link" value={block.ctaHref ?? ""} onChange={(v) => onChange({ ctaHref: v } as Partial<Block>)} />
          </div>
          <SegmentedControl
            label="Primary button style"
            value={block.buttonVariant ?? "white"}
            options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
              { value: "outline", label: "Outline" },
              { value: "white", label: "White" },
            ]}
            onChange={(v) => onChange({ buttonVariant: v } as Partial<Block>)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Secondary button label" value={block.secondaryCtaLabel ?? ""} onChange={(v) => onChange({ secondaryCtaLabel: v } as Partial<Block>)} />
            <Field label="Secondary button link" value={block.secondaryCtaHref ?? ""} onChange={(v) => onChange({ secondaryCtaHref: v } as Partial<Block>)} />
          </div>
          <SegmentedControl
            label="Section padding"
            value={block.padding ?? "md"}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
            onChange={(v) => onChange({ padding: v } as Partial<Block>)}
          />
          <SegmentedControl
            label="Text alignment"
            value={block.textAlign ?? "center"}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => onChange({ textAlign: v } as Partial<Block>)}
          />
          <ColorField label="Text colour" value={block.textColor} onChange={(v) => onChange({ textColor: v } as Partial<Block>)} defaultValue="#ffffff" />
          <BackgroundControls background={block.background} onChange={(bg) => onChange({ background: bg } as Partial<Block>)} />
        </>
      );
    case "faqAccordion":
      return (
        <>
          <Field label="Heading" value={block.heading ?? ""} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          {block.items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-line p-3">
              <Field
                label={`Q${idx + 1}`}
                value={it.q}
                onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, q: v } : x)) } as Partial<Block>)}
              />
              <RichField
                label="Answer"
                value={it.a}
                onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, a: v } : x)) } as Partial<Block>)}
              />
              <button type="button" className="mt-1 text-xs text-accent" onClick={() => onChange({ items: block.items.filter((_, k) => k !== idx) } as Partial<Block>)}>
                Remove question
              </button>
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ items: [...block.items, { q: "", a: "" }] } as Partial<Block>)}>
            + Add question
          </button>
        </>
      );
    case "serviceGrid":
      return (
        <>
          <Field label="Heading" value={block.heading ?? ""} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <div>
            <span className={labelCls}>Services (empty = show all published)</span>
            <div className="mt-1">
              <ServiceSlugPicker
                value={block.slugs ?? []}
                onChange={(slugs) => onChange({ slugs } as Partial<Block>)}
                max={6}
              />
            </div>
            <p className="mt-1 text-xs text-ink-soft">Select up to 6, or leave empty to show all active services.</p>
          </div>
        </>
      );
    case "testimonialCarousel":
    case "locationGrid":
    case "teamGrid":
      return (
        <>
          <Field label="Heading" value={block.heading ?? ""} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <p className="text-xs text-ink-soft">Content is pulled live from published {block.type === "testimonialCarousel" ? "testimonials" : block.type === "locationGrid" ? "locations" : "providers"}.</p>
        </>
      );
    case "numberedList":
      return (
        <>
          <Field label="Title" value={block.title ?? ""} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Intro" value={block.intro ?? ""} onChange={(v) => onChange({ intro: v } as Partial<Block>)} minimal />
          <Radio
            label="Number style"
            value={block.numberStyle ?? "circle"}
            options={[{ value: "circle", label: "Circle" }, { value: "square", label: "Square" }, { value: "plain", label: "Plain" }]}
            onChange={(v) => onChange({ numberStyle: v } as Partial<Block>)}
          />
          <Radio
            label="Columns"
            value={String(block.columns ?? 1)}
            options={[{ value: "1", label: "1 column" }, { value: "2", label: "2 columns" }]}
            onChange={(v) => onChange({ columns: Number(v) } as Partial<Block>)}
          />
          {block.items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Item {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move item up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, -1) } as Partial<Block>)}>↑</button>
                  <button type="button" aria-label="Move item down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, 1) } as Partial<Block>)}>↓</button>
                  <button type="button" aria-label="Remove item" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onChange({ items: block.items.filter((_, k) => k !== idx) } as Partial<Block>)}>✕</button>
                </div>
              </div>
              <Field label="Heading" value={it.heading} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, heading: v } : x)) } as Partial<Block>)} />
              <RichField label="Description" value={it.body ?? ""} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, body: v } : x)) } as Partial<Block>)} minimal />
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ items: [...block.items, { heading: "", body: "" }] } as Partial<Block>)}>+ Add item</button>
        </>
      );
    case "iconList":
      return (
        <>
          <Field label="Title" value={block.title ?? ""} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Intro" value={block.intro ?? ""} onChange={(v) => onChange({ intro: v } as Partial<Block>)} minimal />
          <Field label="Icon colour (hex or token, optional)" value={block.iconColor ?? ""} onChange={(v) => onChange({ iconColor: v } as Partial<Block>)} />
          <Radio
            label="Columns"
            value={String(block.columns ?? 1)}
            options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }]}
            onChange={(v) => onChange({ columns: Number(v) } as Partial<Block>)}
          />
          {block.items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Item {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move item up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, -1) } as Partial<Block>)}>↑</button>
                  <button type="button" aria-label="Move item down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ items: moved(block.items, idx, 1) } as Partial<Block>)}>↓</button>
                  <button type="button" aria-label="Remove item" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onChange({ items: block.items.filter((_, k) => k !== idx) } as Partial<Block>)}>✕</button>
                </div>
              </div>
              <IconField label="Icon" value={it.icon} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, icon: v } : x)) } as Partial<Block>)} />
              <Field label="Label" value={it.label} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, label: v } : x)) } as Partial<Block>)} />
              <RichField label="Description" value={it.body ?? ""} onChange={(v) => onChange({ items: block.items.map((x, k) => (k === idx ? { ...x, body: v } : x)) } as Partial<Block>)} minimal />
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ items: [...block.items, { icon: "CheckCircle2", label: "", body: "" }] } as Partial<Block>)}>+ Add item</button>
        </>
      );
    case "richTextColumns":
      return (
        <>
          <Field label="Heading" value={block.heading ?? ""} onChange={(v) => onChange({ heading: v } as Partial<Block>)} />
          <RichField label="Intro" value={block.intro ?? ""} onChange={(v) => onChange({ intro: v } as Partial<Block>)} />
          <Toggle label="Vertical dividers between columns" checked={!!block.dividers} onChange={(v) => onChange({ dividers: v } as Partial<Block>)} />
          {block.columns.map((col, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Column {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move column up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ columns: moved(block.columns, idx, -1) } as Partial<Block>)}>↑</button>
                  <button type="button" aria-label="Move column down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onChange({ columns: moved(block.columns, idx, 1) } as Partial<Block>)}>↓</button>
                  <button type="button" aria-label="Remove column" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onChange({ columns: block.columns.filter((_, k) => k !== idx) } as Partial<Block>)}>✕</button>
                </div>
              </div>
              <Field label="Column title" value={col.title ?? ""} onChange={(v) => onChange({ columns: block.columns.map((x, k) => (k === idx ? { ...x, title: v } : x)) } as Partial<Block>)} />
              <RichField label="Body" value={col.body} onChange={(v) => onChange({ columns: block.columns.map((x, k) => (k === idx ? { ...x, body: v } : x)) } as Partial<Block>)} />
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand-dark" onClick={() => onChange({ columns: [...block.columns, { title: "", body: "" }] } as Partial<Block>)}>+ Add column</button>
        </>
      );
    case "imageLeftTextRight":
    case "imageRightTextLeft":
      return (
        <>
          <ImageField label="Image" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <Field label="Image alt text" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
          <Radio
            label="Image width"
            value={String(block.imageWidthPercent ?? 50)}
            options={[{ value: "40", label: "40%" }, { value: "45", label: "45%" }, { value: "50", label: "50%" }]}
            onChange={(v) => onChange({ imageWidthPercent: Number(v) } as Partial<Block>)}
          />
          <Field label="Title" value={block.title} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA label" value={block.ctaLabel ?? ""} onChange={(v) => onChange({ ctaLabel: v } as Partial<Block>)} />
            <Field label="CTA link" value={block.ctaHref ?? ""} onChange={(v) => onChange({ ctaHref: v } as Partial<Block>)} />
          </div>
        </>
      );
    case "imageTitleBelow":
      return (
        <>
          <ImageField label="Image" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <Field label="Image alt text" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
          <Radio
            label="Aspect ratio"
            value={block.aspectRatio ?? "16/9"}
            options={[{ value: "16/9", label: "16:9" }, { value: "4/3", label: "4:3" }, { value: "1/1", label: "1:1" }, { value: "3/2", label: "3:2" }]}
            onChange={(v) => onChange({ aspectRatio: v } as Partial<Block>)}
          />
          <Radio
            label="Max width"
            value={block.maxWidth ?? "lg"}
            options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "full", label: "Full" }]}
            onChange={(v) => onChange({ maxWidth: v } as Partial<Block>)}
          />
          <Field label="Title" value={block.title} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Caption" value={block.caption ?? ""} onChange={(v) => onChange({ caption: v } as Partial<Block>)} minimal />
        </>
      );
    case "imageTitleBeside":
      return (
        <>
          <ImageField label="Image" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <Field label="Image alt text" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
          <Radio
            label="Image position"
            value={block.imagePosition}
            options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]}
            onChange={(v) => onChange({ imagePosition: v } as Partial<Block>)}
          />
          <Radio
            label="Image size"
            value={block.imageSize ?? "md"}
            options={[{ value: "sm", label: "Small (30%)" }, { value: "md", label: "Medium (40%)" }, { value: "lg", label: "Large (50%)" }]}
            onChange={(v) => onChange({ imageSize: v } as Partial<Block>)}
          />
          <Radio
            label="Vertical alignment"
            value={block.verticalAlign ?? "top"}
            options={[{ value: "top", label: "Top" }, { value: "center", label: "Centre" }]}
            onChange={(v) => onChange({ verticalAlign: v } as Partial<Block>)}
          />
          <Field label="Title" value={block.title} onChange={(v) => onChange({ title: v } as Partial<Block>)} />
          <RichField label="Body" value={block.body} onChange={(v) => onChange({ body: v } as Partial<Block>)} />
        </>
      );
    case "imageOnly":
      return (
        <>
          <ImageField label="Image" value={block.image.url} onChange={(v) => onChange({ image: { ...block.image, url: v } } as Partial<Block>)} />
          <div>
            <Field label="Alt text (required)" value={block.image.alt} onChange={(v) => onChange({ image: { ...block.image, alt: v } } as Partial<Block>)} />
            {!block.image.alt.trim() && (
              <p className="mt-1 text-xs text-accent">Alt text is required for accessibility.</p>
            )}
          </div>
          <Radio
            label="Max width"
            value={block.maxWidth ?? "full"}
            options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "XLarge" }, { value: "full", label: "Full width" }]}
            onChange={(v) => onChange({ maxWidth: v } as Partial<Block>)}
          />
          <Radio
            label="Aspect ratio"
            value={block.aspectRatio ?? "original"}
            options={[{ value: "original", label: "Original" }, { value: "16/9", label: "16:9" }, { value: "4/3", label: "4:3" }, { value: "1/1", label: "1:1" }, { value: "3/2", label: "3:2" }]}
            onChange={(v) => onChange({ aspectRatio: v } as Partial<Block>)}
          />
          {(block.aspectRatio ?? "original") !== "original" && (
            <Radio
              label="Object fit"
              value={block.objectFit ?? "cover"}
              options={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }]}
              onChange={(v) => onChange({ objectFit: v } as Partial<Block>)}
            />
          )}
          {(block.maxWidth ?? "full") !== "full" && (
            <Radio
              label="Alignment"
              value={block.align ?? "center"}
              options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]}
              onChange={(v) => onChange({ align: v } as Partial<Block>)}
            />
          )}
          <Toggle label="Rounded corners" checked={!!block.rounded} onChange={(v) => onChange({ rounded: v } as Partial<Block>)} />
          <Toggle
            label="Make image a link"
            checked={block.linkUrl !== undefined}
            onChange={(on) =>
              onChange({
                linkUrl: on ? (block.linkUrl ?? "") : undefined,
                linkOpensNewTab: on ? block.linkOpensNewTab : undefined,
              } as Partial<Block>)
            }
          />
          {block.linkUrl !== undefined && (
            <>
              <Field label="Link URL" value={block.linkUrl} onChange={(v) => onChange({ linkUrl: v } as Partial<Block>)} />
              <Toggle label="Open in new tab" checked={!!block.linkOpensNewTab} onChange={(v) => onChange({ linkOpensNewTab: v } as Partial<Block>)} />
            </>
          )}
          <Field label="Caption (optional)" value={block.caption ?? ""} onChange={(v) => onChange({ caption: v } as Partial<Block>)} />
          <p className="text-xs text-ink-soft">For a richer caption with formatting, use the &quot;Image with Title Below&quot; block instead.</p>
        </>
      );
    case "columnLayout":
      return <ColumnLayoutFields block={block} onChange={onChange} />;
    case "verticalSpacer":
      return (
        <>
          <SegmentedControl
            label="Size"
            value={block.size}
            options={[...sizeOptions, { value: "custom" as const, label: "Custom" }]}
            onChange={(v) => onChange({ size: v } as Partial<Block>)}
          />
          {block.size === "custom" && (
            <div>
              <Field
                label="Custom height (px, 4–400)"
                value={String(block.customPx ?? 40)}
                onChange={(v) => onChange({ customPx: Math.min(400, Math.max(4, Number(v) || 0)) } as Partial<Block>)}
              />
              <p className="mt-1 text-xs text-ink-soft">Will add {block.customPx ?? 40}px of vertical space.</p>
            </div>
          )}
          <Toggle
            label="Show a dashed placeholder in the editor (invisible on the public site)."
            checked={block.showInEditor !== false}
            onChange={(v) => onChange({ showInEditor: v } as Partial<Block>)}
          />
          <div>
            <span className={labelCls}>
              Approx. {block.size === "custom" ? (block.customPx ?? 40) : SPACER_PX[block.size] ?? 40}px
            </span>
            <div
              className="mt-1 w-full rounded bg-brand-dark/20"
              style={{ height: block.size === "custom" ? (block.customPx ?? 40) : SPACER_PX[block.size] ?? 40 }}
            />
          </div>
        </>
      );
    case "horizontalDivider":
      return <DividerFields block={block} onChange={onChange} />;
    default:
      return null;
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />
    </label>
  );
}
function RichField({
  label,
  value,
  onChange,
  minimal = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minimal?: boolean;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">
        <RichTextEditor
          value={value}
          onChange={onChange}
          minimalMode={minimal}
          ariaLabel={label}
          height={minimal ? 200 : 320}
        />
      </div>
    </div>
  );
}

export function Radio({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-1.5 text-sm text-ink">
            <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">
        <MediaPicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function IconField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">
        <IconPicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function moved<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

// ─── Optional background toggle + editor (hero + ctaBanner) ─────────────────

function BackgroundControls({
  background,
  onChange,
}: {
  background?: BlockBackground;
  onChange: (bg: BlockBackground | undefined) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <Toggle
        label="Custom background (solid colour, image, or gradient)"
        checked={!!background}
        onChange={(on) =>
          onChange(on ? background ?? { type: "color", color: "#31585d", colorOpacity: 100 } : undefined)
        }
      />
      {background && <BackgroundEditor value={background} onChange={onChange} />}
    </div>
  );
}

// ─── Column layout editor (split picker + per-column nested canvases) ───────

function ColumnLayoutFields({
  block,
  onChange,
}: {
  block: ColumnLayoutBlock;
  onChange: (patch: Partial<Block>) => void;
}) {
  const count = columnCountForSplit(block.split);
  const percentages = columnPercentages(block.split);

  function setSplit(split: ColumnSplit) {
    const newCount = columnCountForSplit(split);
    const cols = block.columns.map((c) => [...c]);
    if (newCount < cols.length) {
      const kept = cols.slice(0, newCount);
      const dropped = cols.slice(newCount).flat();
      if (dropped.length) kept[newCount - 1] = [...kept[newCount - 1], ...dropped];
      onChange({ split, columns: kept } as Partial<Block>);
    } else {
      while (cols.length < newCount) cols.push([]);
      onChange({ split, columns: cols } as Partial<Block>);
    }
  }

  function updateColumn(ci: number, blocks: Block[]) {
    onChange({ columns: block.columns.map((c, i) => (i === ci ? blocks : c)) } as Partial<Block>);
  }
  function moveBlockToColumn(from: number, idx: number, to: number) {
    const cols = block.columns.map((c) => [...c]);
    const [moving] = cols[from].splice(idx, 1);
    if (moving) (cols[to] ??= []).push(moving);
    onChange({ columns: cols } as Partial<Block>);
  }

  return (
    <>
      <div>
        <span className={labelCls}>Split ratio</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {COLUMN_SPLITS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={block.split === s.value}
              aria-label={`${s.label} (${columnCountForSplit(s.value)} columns)`}
              onClick={() => setSplit(s.value)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 ${
                block.split === s.value ? "border-brand-dark ring-1 ring-brand-dark" : "border-line hover:bg-surface-alt"
              }`}
            >
              <ColumnSplitPreview split={s.value} width={64} height={26} />
              <span className="text-[11px] text-ink-soft">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SegmentedControl
        label="Column gap"
        value={block.gap ?? "md"}
        options={[
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "XLarge" },
        ]}
        onChange={(v) => onChange({ gap: v } as Partial<Block>)}
      />
      <SegmentedControl
        label="Vertical alignment"
        value={block.verticalAlign ?? "top"}
        options={[
          { value: "top", label: "Top" },
          { value: "center", label: "Centre" },
          { value: "bottom", label: "Bottom" },
        ]}
        onChange={(v) => onChange({ verticalAlign: v } as Partial<Block>)}
      />
      <Toggle
        label="Stack columns vertically on mobile."
        checked={block.stackOnMobile !== false}
        onChange={(v) => onChange({ stackOnMobile: v } as Partial<Block>)}
      />
      {block.stackOnMobile !== false && (
        <Toggle
          label="Reverse column order when stacked on mobile."
          checked={!!block.reverseOnMobile}
          onChange={(v) => onChange({ reverseOnMobile: v } as Partial<Block>)}
        />
      )}

      <div className="space-y-3">
        {Array.from({ length: count }).map((_, ci) => (
          <ColumnCanvas
            key={ci}
            index={ci}
            percent={percentages[ci]}
            blocks={block.columns[ci] ?? []}
            columnCount={count}
            onUpdate={(blocks) => updateColumn(ci, blocks)}
            onMoveTo={(idx, to) => moveBlockToColumn(ci, idx, to)}
          />
        ))}
      </div>
    </>
  );
}

function ColumnCanvas({
  index,
  percent,
  blocks,
  columnCount,
  onUpdate,
  onMoveTo,
}: {
  index: number;
  percent: number;
  blocks: Block[];
  columnCount: number;
  onUpdate: (blocks: Block[]) => void;
  onMoveTo: (idx: number, to: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  // Guard: a column cannot contain another column layout (one level of nesting).
  const nestable = blockRegistry.filter((m) => m.type !== "columnLayout");

  function addBlock(type: BlockType) {
    const meta = blockRegistry.find((m) => m.type === type);
    if (!meta) return;
    onUpdate([...blocks, meta.create()]);
    setAdding(false);
  }

  return (
    <div className="rounded-lg border border-line bg-surface-alt/40 p-3">
      <p className="text-xs font-semibold text-brand-dark">Column {index + 1} ({percent}%)</p>
      <div className="mt-2 space-y-2">
        {blocks.map((b, bi) => (
          <div key={bi} className="rounded-lg border border-line bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-brand-dark">{blockLabel(b.type)}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Move block up" className="rounded p-1 hover:bg-surface-alt" onClick={() => onUpdate(moved(blocks, bi, -1))}>↑</button>
                <button type="button" aria-label="Move block down" className="rounded p-1 hover:bg-surface-alt" onClick={() => onUpdate(moved(blocks, bi, 1))}>↓</button>
                {columnCount > 1 && <MoveToColumn current={index} count={columnCount} onMove={(to) => onMoveTo(bi, to)} />}
                <button type="button" aria-label="Remove block" className="rounded p-1 text-accent hover:bg-surface-alt" onClick={() => onUpdate(blocks.filter((_, k) => k !== bi))}>✕</button>
              </div>
            </div>
            <div className="mt-2 space-y-2 text-[0.92em]">
              <BlockFields block={b} onChange={(patch) => onUpdate(blocks.map((x, k) => (k === bi ? ({ ...x, ...patch } as Block) : x)))} />
            </div>
          </div>
        ))}
        {blocks.length === 0 && <p className="text-xs text-ink-soft">No blocks in this column yet.</p>}
      </div>

      {adding ? (
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-line bg-white p-2">
          {nestable.map((m) => (
            <button key={m.type} type="button" onClick={() => addBlock(m.type)} className="rounded border border-line px-2 py-1 text-left text-xs hover:bg-surface-alt">
              {m.label}
            </button>
          ))}
          <button type="button" onClick={() => setAdding(false)} className="col-span-2 mt-1 text-xs text-ink-soft hover:text-ink">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 w-full rounded border border-dashed border-line py-1.5 text-xs font-semibold text-brand-dark hover:bg-surface-alt"
        >
          + Add block
        </button>
      )}
    </div>
  );
}

function MoveToColumn({ current, count, onMove }: { current: number; count: number; onMove: (to: number) => void }) {
  return (
    <select
      aria-label={`Move block from column ${current + 1} to another column`}
      value=""
      onChange={(e) => {
        const to = Number(e.target.value);
        if (!Number.isNaN(to)) onMove(to);
        e.currentTarget.value = "";
      }}
      className="rounded border border-line px-1 py-0.5 text-xs"
    >
      <option value="">Move →</option>
      {Array.from({ length: count }).map((_, i) =>
        i === current ? null : (
          <option key={i} value={i}>
            Column {i + 1}
          </option>
        ),
      )}
    </select>
  );
}

// ─── Horizontal divider editor (with live preview) ─────────────────────────

function DividerFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "horizontalDivider" }>;
  onChange: (patch: Partial<Block>) => void;
}) {
  const border = `${block.thickness ?? 1}px ${block.style ?? "solid"} ${block.color ?? "#94a3b8"}`;
  return (
    <>
      <SegmentedControl
        label="Line style"
        value={block.style ?? "solid"}
        options={[
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
          { value: "double", label: "Double" },
        ]}
        onChange={(v) => onChange({ style: v } as Partial<Block>)}
      />
      <SegmentedControl
        label="Line thickness"
        value={String(block.thickness ?? 1) as "1" | "2" | "4"}
        options={[
          { value: "1", label: "1px" },
          { value: "2", label: "2px" },
          { value: "4", label: "4px" },
        ]}
        onChange={(v) => onChange({ thickness: Number(v) } as Partial<Block>)}
      />
      <ColorField label="Line colour" value={block.color} onChange={(v) => onChange({ color: v } as Partial<Block>)} defaultValue="#94a3b8" />
      <SegmentedControl
        label="Line width"
        value={block.width ?? "full"}
        options={[
          { value: "full", label: "Full" },
          { value: "3/4", label: "3/4" },
          { value: "1/2", label: "1/2" },
          { value: "1/4", label: "1/4" },
        ]}
        onChange={(v) => onChange({ width: v } as Partial<Block>)}
      />
      {(block.width ?? "full") !== "full" && (
        <SegmentedControl
          label="Alignment"
          value={block.align ?? "center"}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Centre" },
            { value: "right", label: "Right" },
          ]}
          onChange={(v) => onChange({ align: v } as Partial<Block>)}
        />
      )}
      <Field label="Label text (optional)" value={block.label ?? ""} onChange={(v) => onChange({ label: v } as Partial<Block>)} />
      {block.label && (
        <SegmentedControl
          label="Label size"
          value={block.labelSize ?? "sm"}
          options={[
            { value: "xs", label: "X-Small" },
            { value: "sm", label: "Small" },
            { value: "base", label: "Base" },
          ]}
          onChange={(v) => onChange({ labelSize: v } as Partial<Block>)}
        />
      )}
      <SegmentedControl
        label="Spacing above"
        value={block.spacingTop ?? "md"}
        options={sizeOptions}
        onChange={(v) => onChange({ spacingTop: v } as Partial<Block>)}
      />
      <SegmentedControl
        label="Spacing below"
        value={block.spacingBottom ?? "md"}
        options={sizeOptions}
        onChange={(v) => onChange({ spacingBottom: v } as Partial<Block>)}
      />
      <div>
        <span className={labelCls}>Live preview</span>
        <div className="mt-1 flex h-[120px] items-center justify-center rounded-lg border border-line bg-surface-alt px-4">
          {block.label ? (
            <div className="flex w-full items-center gap-4 text-ink-soft">
              <span style={{ borderTop: border, opacity: 0.5, flex: 1 }} />
              <span className="whitespace-nowrap text-sm font-medium">{block.label}</span>
              <span style={{ borderTop: border, opacity: 0.5, flex: 1 }} />
            </div>
          ) : (
            <div
              style={{
                width: block.width === "3/4" ? "75%" : block.width === "1/2" ? "50%" : block.width === "1/4" ? "25%" : "100%",
                borderTop: border,
                opacity: 0.5,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
