"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { type Block, blockLabel, blockPreview } from "@/lib/cms/blocks";

export function BlockCard({
  id,
  block,
  expanded,
  onToggleExpand,
  onDuplicate,
  onToggleVisible,
  onDelete,
  children,
}: {
  id: string;
  block: Block;
  expanded: boolean;
  onToggleExpand: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const hidden = block.isVisible === false;
  const preview = blockPreview(block);
  const iconBtn = "rounded p-1 hover:bg-surface-alt";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-card border border-line bg-white ${hidden ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          className={`${iconBtn} cursor-grab text-ink-soft`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-brand-dark">{blockLabel(block.type)}</span>
            {hidden && (
              <span className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-ink-soft">
                Hidden
              </span>
            )}
          </div>
          {preview && <p className="truncate text-xs text-ink-soft">{preview}</p>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse block" : "Edit block"}
            aria-expanded={expanded}
            className={iconBtn}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDuplicate} aria-label="Duplicate block" className={iconBtn}>
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleVisible}
            aria-label={hidden ? "Show block" : "Hide block"}
            className={iconBtn}
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete block"
            className={`${iconBtn} text-accent`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt px-3 py-2 text-sm">
          <span className="text-ink">Delete this block?</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
          </span>
        </div>
      )}

      {expanded && <div className="space-y-3 border-t border-line p-4">{children}</div>}
    </div>
  );
}
