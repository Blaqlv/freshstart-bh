import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { parseBlocks } from "@/lib/cms/blocks";
import { PageEditor } from "@/components/admin/PageEditor";
import { deletePage, unpublishPage } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("content:read");
  const { id } = await params;

  const page = await db.page.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!page) notFound();

  const draft = page.versions[0];
  const blocks = parseBlocks(draft?.blocks);
  const canPublish = can(session.role, "content:publish");

  return (
    <div className="space-y-6">
      <Link href="/admin/pages" className="text-sm text-brand-dark hover:underline">← All pages</Link>

      <PageEditor
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
          seoTitle: page.seoTitle ?? "",
          seoDescription: page.seoDescription ?? "",
          canonicalUrl: page.canonicalUrl ?? "",
          ogImageUrl: page.ogImageUrl ?? "",
          template: page.template,
          hasSidebar: page.hasSidebar,
          defaultBlockSpacing: page.defaultBlockSpacing ?? "",
        }}
        initialBlocks={blocks}
        canPublish={canPublish}
      />

      {canPublish && (
        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          {page.status === "PUBLISHED" && (
            <form action={unpublishPage}>
              <input type="hidden" name="pageId" value={page.id} />
              <button className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt">
                Unpublish
              </button>
            </form>
          )}
          <form action={deletePage}>
            <input type="hidden" name="pageId" value={page.id} />
            <button className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white">
              Delete page
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
