"use client";

import { useState } from "react";
import {
  type Block,
  type BlockType,
  blockRegistry,
  blockLabel,
} from "@/lib/cms/blocks";
import { savePage, publishPage } from "@/app/admin/pages/actions";
import { StatusBadge } from "./StatusBadge";
import type { ContentStatus } from "@prisma/client";
import { RichTextEditor } from "./RichTextEditor";

type PageData = {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
};

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-xs font-medium text-ink-soft";

export function PageEditor({
  page,
  initialBlocks,
  canPublish,
}: {
  page: PageData;
  initialBlocks: Block[];
  canPublish: boolean;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [title, setTitle] = useState(page.title);

  function update(i: number, patch: Partial<Block>) {
    setBlocks((b) => b.map((blk, idx) => (idx === i ? ({ ...blk, ...patch } as Block) : blk)));
  }
  function move(i: number, dir: -1 | 1) {
    setBlocks((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const copy = [...b];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function remove(i: number) {
    setBlocks((b) => b.filter((_, idx) => idx !== i));
  }
  function add(type: BlockType) {
    const meta = blockRegistry.find((m) => m.type === type);
    if (meta) setBlocks((b) => [...b, meta.create()]);
  }

  return (
    <form className="space-y-6">
      <input type="hidden" name="pageId" value={page.id} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

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

      {/* Blocks */}
      <div className="space-y-4">
        {blocks.length === 0 && (
          <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-ink-soft">
            No content blocks yet. Add one below.
          </p>
        )}
        {blocks.map((block, i) => (
          <div key={i} className="rounded-card border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line bg-surface-alt px-4 py-2">
              <span className="text-sm font-semibold text-brand-dark">{blockLabel(block.type)}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="rounded p-1 hover:bg-white">↑</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="rounded p-1 hover:bg-white">↓</button>
                <button type="button" onClick={() => remove(i)} aria-label="Remove block" className="rounded p-1 text-accent hover:bg-white">✕</button>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <BlockFields block={block} onChange={(patch) => update(i, patch)} />
            </div>
          </div>
        ))}
      </div>

      {/* Add block */}
      <div className="rounded-card border border-line bg-white p-4">
        <p className={labelCls}>Add a content block</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {blockRegistry.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => add(m.type)}
              title={m.description}
              className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-brand hover:text-brand-dark"
            >
              + {m.label}
            </button>
          ))}
        </div>
      </div>

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
