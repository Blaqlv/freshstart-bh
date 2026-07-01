import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { parseBlocks } from "@/lib/cms/blocks";
import { PageEditor } from "@/components/admin/PageEditor";
import { deletePage, unpublishPage } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireCapability("content:read");
  const { id } = await params;
  const sp = await searchParams;

  const page = await db.page.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      service: { select: { id: true } },
    },
  });
  if (!page) notFound();

  const draft = page.versions[0];
  const blocks = parseBlocks(draft?.blocks);
  const canPublish = can(session.role, "content:publish");
  const isServicePage = !!page.service;

  return (
    <div className="space-y-6">
      <Link href="/admin/pages" className="text-sm text-brand-dark hover:underline">← All pages</Link>

      {sp.duplicated === "service" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Duplicated from a service page</p>
          <p className="mt-1 text-sm text-amber-700">
            This is a standalone General page — it is not linked to any service. To create a new
            service with its own page, use Services → Add Service instead.
          </p>
        </div>
      )}

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
        isServicePage={isServicePage}
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
