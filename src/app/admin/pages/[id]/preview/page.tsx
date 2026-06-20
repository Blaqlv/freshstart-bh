import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { parseBlocks } from "@/lib/cms/blocks";
import { BlockRenderer } from "@/components/cms/BlockRenderer";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("content:read");
  const { id } = await params;

  const page = await db.page.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!page) notFound();

  const blocks = parseBlocks(page.versions[0]?.blocks);

  return (
    <div>
      <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
        Draft preview — “{page.title}” (/{page.slug}). Not visible to the public.
      </div>
      <BlockRenderer blocks={blocks} />
    </div>
  );
}
