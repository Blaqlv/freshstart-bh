"use client";

import { type Block } from "@/lib/cms/blocks";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPicker } from "./MediaPicker";
import { IconPicker } from "./IconPicker";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-xs font-medium text-ink-soft";

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
            <Field label="CTA label" value={block.ctaLabel ?? ""} onChange={(v) => onChange({ ctaLabel: v } as Partial<Block>)} />
            <Field label="CTA link" value={block.ctaHref ?? ""} onChange={(v) => onChange({ ctaHref: v } as Partial<Block>)} />
          </div>
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
          <Field
            label="Service slugs (comma-separated; blank = all published)"
            value={(block.slugs ?? []).join(", ")}
            onChange={(v) => onChange({ slugs: v.split(",").map((s) => s.trim()).filter(Boolean) } as Partial<Block>)}
          />
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
