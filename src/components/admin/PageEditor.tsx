"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import {
  type Block,
  type BlockType,
  blockRegistry,
} from "@/lib/cms/blocks";
import { savePage, publishPage } from "@/app/admin/pages/actions";
import { StatusBadge } from "./StatusBadge";
import type { ContentStatus, PageTemplate } from "@prisma/client";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPicker } from "./MediaPicker";
import { IconPicker } from "./IconPicker";
import { BlockCard } from "./BlockCard";
import { BlockPicker } from "./BlockPicker";

type PageData = {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  template: PageTemplate;
  hasSidebar: boolean;
};

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-xs font-medium text-ink-soft";

type Item = { id: string; block: Block };

let idCounter = 0;
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  idCounter += 1;
  return `b${Date.now()}-${idCounter}`;
}

export function PageEditor({
  page,
  initialBlocks,
  canPublish,
}: {
  page: PageData;
  initialBlocks: Block[];
  canPublish: boolean;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    initialBlocks.map((block) => ({ id: makeId(), block })),
  );
  const [title, setTitle] = useState(page.title);
  const [template, setTemplate] = useState<PageTemplate>(page.template);
  const [hasSidebar, setHasSidebar] = useState(page.hasSidebar);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateBlock(id: string, patch: Partial<Block>) {
    setItems((arr) =>
      arr.map((it) => (it.id === id ? { ...it, block: { ...it.block, ...patch } as Block } : it)),
    );
  }
  function removeBlock(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  }
  function duplicateBlock(id: string) {
    setItems((arr) => {
      const idx = arr.findIndex((it) => it.id === id);
      if (idx === -1) return arr;
      const copy: Item = { id: makeId(), block: structuredClone(arr[idx].block) };
      return [...arr.slice(0, idx + 1), copy, ...arr.slice(idx + 1)];
    });
  }
  function toggleVisible(id: string) {
    setItems((arr) =>
      arr.map((it) =>
        it.id === id
          ? { ...it, block: { ...it.block, isVisible: it.block.isVisible === false } as Block }
          : it,
      ),
    );
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((arr) => {
      const from = arr.findIndex((it) => it.id === active.id);
      const to = arr.findIndex((it) => it.id === over.id);
      if (from === -1 || to === -1) return arr;
      return arrayMove(arr, from, to);
    });
  }
  function openPicker(index: number) {
    setInsertAt(index);
    setPickerOpen(true);
  }
  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setInsertAt(null);
  }, []);
  function handlePick(type: BlockType) {
    const meta = blockRegistry.find((m) => m.type === type);
    if (!meta) return;
    const item: Item = { id: makeId(), block: meta.create() };
    setItems((arr) => {
      const at = insertAt ?? arr.length;
      return [...arr.slice(0, at), item, ...arr.slice(at)];
    });
    setExpandedId(item.id);
    setPickerOpen(false);
    setInsertAt(null);
  }

  return (
    <form className="space-y-6">
      <input type="hidden" name="pageId" value={page.id} />
      <input type="hidden" name="blocks" value={JSON.stringify(items.map((it) => it.block))} />
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="hasSidebar" value={String(hasSidebar)} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-dark">Edit page</h1>
            <StatusBadge status={page.status} />
          </div>
          <p className="text-sm text-ink-soft">/{page.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/pages/${page.id}/preview`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-brand-dark px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-dark hover:text-white"
          >
            Preview draft
          </a>
          <button
            type="submit"
            formAction={savePage}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-alt"
          >
            Save draft
          </button>
          {canPublish && (
            <button
              type="submit"
              formAction={publishPage}
              className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Save &amp; publish
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="title" className={labelCls}>Page title</label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={input}
        />
      </div>

      <div className="space-y-3 rounded-card border border-line bg-white p-4">
        <Radio
          label="Template"
          value={template}
          options={[
            { value: "SERVICE_DETAIL", label: "Service Detail page" },
            { value: "GENERAL", label: "General page" },
          ]}
          onChange={(v) => setTemplate(v as PageTemplate)}
        />
        {template === "GENERAL" && (
          <Toggle
            label="Show sidebar with contact CTAs and insurance information"
            checked={hasSidebar}
            onChange={setHasSidebar}
          />
        )}
      </div>

      {/* Blocks */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-line p-8 text-center">
            <p className="text-sm font-semibold text-brand-dark">No content blocks yet</p>
            <p className="mt-1 text-sm text-ink-soft">
              Add your first block to start building this page.
            </p>
            <button
              type="button"
              onClick={() => openPicker(0)}
              className="mt-3 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              + Add block
            </button>
          </div>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={items.map((it) => it.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((it, i) => (
                  <div key={it.id}>
                    {i > 0 && (
                      <div className="group flex h-4 items-center justify-center">
                        <button
                          type="button"
                          onClick={() => openPicker(i)}
                          aria-label="Insert block here"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft opacity-0 transition hover:border-brand hover:text-brand-dark group-hover:opacity-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <BlockCard
                      id={it.id}
                      block={it.block}
                      expanded={expandedId === it.id}
                      onToggleExpand={() =>
                        setExpandedId((cur) => (cur === it.id ? null : it.id))
                      }
                      onDuplicate={() => duplicateBlock(it.id)}
                      onToggleVisible={() => toggleVisible(it.id)}
                      onDelete={() => removeBlock(it.id)}
                    >
                      <BlockFields block={it.block} onChange={(patch) => updateBlock(it.id, patch)} />
                    </BlockCard>
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            <button
              type="button"
              onClick={() => openPicker(items.length)}
              className="w-full rounded-card border border-dashed border-line py-3 text-sm font-semibold text-brand-dark hover:border-brand hover:bg-surface-alt"
            >
              + Add block
            </button>
          </>
        )}
      </div>

      <BlockPicker
        open={pickerOpen}
        template={template}
        onPick={handlePick}
        onClose={closePicker}
      />

      {/* SEO */}
      <details className="rounded-card border border-line bg-white p-4">
        <summary className="cursor-pointer font-semibold text-brand-dark">SEO &amp; metadata</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>SEO title</label>
            <input name="seoTitle" defaultValue={page.seoTitle} className={input} />
          </div>
          <div>
            <label className={labelCls}>Canonical URL</label>
            <input name="canonicalUrl" defaultValue={page.canonicalUrl} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Meta description</label>
            <textarea name="seoDescription" defaultValue={page.seoDescription} rows={2} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>OG image URL</label>
            <input name="ogImageUrl" defaultValue={page.ogImageUrl} className={input} />
          </div>
        </div>
      </details>
    </form>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
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

function Radio({
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

function Toggle({
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
