import type { ContentStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

const styles: Record<ContentStatus, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status.toLowerCase()}
    </span>
  );
}
