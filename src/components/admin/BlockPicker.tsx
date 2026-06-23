"use client";

import { useMemo, useState } from "react";
import type { PageTemplate } from "@prisma/client";
import { SlideOver } from "./SlideOver";
import { BlockThumbnail } from "./block-thumbnails";
import { blockRegistry, blockCategories, type BlockType } from "@/lib/cms/blocks";

export function BlockPicker({
  open,
  template,
  onPick,
  onClose,
}: {
  open: boolean;
  template: PageTemplate;
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  // Service Detail pages use their own hero component (Part 3.1), so hide it.
  const available = useMemo(
    () => blockRegistry.filter((m) => !(template === "SERVICE_DETAIL" && m.type === "hero")),
    [template],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (m) => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }, [available, query]);

  return (
    <SlideOver open={open} onClose={onClose} title="Add a block">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search blocks…"
        aria-label="Search block types"
        className="mb-4 w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      <div className="space-y-6">
        {blockCategories.map((cat) => {
          const items = matches.filter((m) => m.category === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} aria-label={cat.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {cat.label}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {items.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => onPick(m.type)}
                    className="flex flex-col gap-2 rounded-lg border border-line p-3 text-left hover:border-brand hover:bg-surface-alt"
                  >
                    <span className="flex items-center justify-center rounded bg-surface-alt p-1">
                      <BlockThumbnail type={m.type} />
                    </span>
                    <span className="text-sm font-semibold text-brand-dark">{m.label}</span>
                    <span className="text-xs text-ink-soft">{m.description}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {matches.length === 0 && (
          <p className="text-center text-sm text-ink-soft">No blocks match “{query}”.</p>
        )}
      </div>
    </SlideOver>
  );
}
