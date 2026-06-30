"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { savePage, publishPage, autosavePage } from "@/app/admin/pages/actions";
import { StatusBadge } from "./StatusBadge";
import { SaveStatus } from "./SaveStatus";
import type { ContentStatus, PageTemplate } from "@prisma/client";
import { Radio, Toggle } from "./BlockFields";
import { BlockCard } from "./BlockCard";
import { BlockEditorPanel } from "./BlockEditorPanel";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const firstRender = useRef(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function removeBlock(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
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
  function updateBlockSpacing(
    id: string,
    patch: { spaceAbove?: import("@/lib/cms/spacing").BlockSpacing; spaceBelow?: import("@/lib/cms/spacing").BlockSpacing },
  ) {
    setItems((arr) =>
      arr.map((it) => (it.id === id ? { ...it, block: { ...it.block, ...patch } as Block } : it)),
    );
    dirtyRef.current = true;
    setTimeout(() => {
      void autosave();
    }, 0);
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
    setEditingId(item.id);
    setPickerOpen(false);
    setInsertAt(null);
  }

  const cancelEdit = useCallback(() => setEditingId(null), []);
  function saveBlock(updated: Block) {
    if (editingId) {
      setItems((arr) =>
        arr.map((it) => (it.id === editingId ? { ...it, block: updated } : it)),
      );
    }
    setEditingId(null);
    dirtyRef.current = true;
    setTimeout(() => {
      void autosave();
    }, 0);
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
  }, [items, title, template, hasSidebar]);

  const autosave = useCallback(async () => {
    if (savingRef.current || !dirtyRef.current || !formRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await autosavePage(new FormData(formRef.current));
      dirtyRef.current = false;
      setSavedAt(new Date(res.savedAt));
    } catch (err) {
      console.warn("Autosave failed", err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void autosave();
    }, 30000);
    return () => clearInterval(timer);
  }, [autosave]);

  return (
    <form
      ref={formRef}
      className="space-y-6"
      onInput={() => {
        dirtyRef.current = true;
      }}
    >
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
        <div className="flex flex-wrap items-center gap-2">
          <SaveStatus saving={saving} savedAt={savedAt} />
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
                      onEdit={() => setEditingId(it.id)}
                      onDuplicate={() => duplicateBlock(it.id)}
                      onToggleVisible={() => toggleVisible(it.id)}
                      onDelete={() => removeBlock(it.id)}
                      onSpacingChange={(patch) => updateBlockSpacing(it.id, patch)}
                    />
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

      {editingId &&
        (() => {
          const editingItem = items.find((it) => it.id === editingId);
          return editingItem ? (
            <BlockEditorPanel
              key={editingItem.id}
              block={editingItem.block}
              onSave={saveBlock}
              onCancel={cancelEdit}
            />
          ) : null;
        })()}

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

