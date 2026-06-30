"use client";

import { useState } from "react";
import { SlideOver } from "./SlideOver";
import { BlockFields } from "./BlockFields";
import { SpacingControls } from "./SpacingControls";
import { type Block, blockLabel } from "@/lib/cms/blocks";

export function BlockEditorPanel({
  block,
  onSave,
  onCancel,
}: {
  block: Block;
  onSave: (block: Block) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Block>(block);
  const showSpacing = draft.type !== "verticalSpacer" && draft.type !== "horizontalDivider";

  return (
    <SlideOver open onClose={onCancel} title={`Edit ${blockLabel(draft.type)}`}>
      <div className="space-y-3">
        <BlockFields
          block={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }) as Block)}
        />
        {showSpacing && (
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Spacing
            </summary>
            <div className="mt-3">
              <SpacingControls
                spaceAbove={draft.spaceAbove}
                spaceBelow={draft.spaceBelow}
                onChange={(patch) => setDraft((d) => ({ ...d, ...patch }) as Block)}
              />
            </div>
          </details>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-alt"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Save Block
        </button>
      </div>
    </SlideOver>
  );
}
