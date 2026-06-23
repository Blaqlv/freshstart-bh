"use client";

import { useEffect, useState } from "react";

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}

export function SaveStatus({ saving, savedAt }: { saving: boolean; savedAt: Date | null }) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => force((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [savedAt]);

  let text = "";
  if (saving) text = "Saving…";
  else if (savedAt) text = `Saved ${relativeTime(savedAt)}`;

  return (
    <span aria-live="polite" className="self-center text-xs text-ink-soft">
      {text}
    </span>
  );
}
