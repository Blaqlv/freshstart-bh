import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { parseBlocks } from "@/lib/cms/blocks";
import { PageEditor } from "@/components/admin/PageEditor";
import { updateServiceMetadata, createServicePage, publishServicePage } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("content:read");
  const { id } = await params;

  const service = await db.service.findUnique({
    where: { id },
    include: { page: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } } },
  });
  if (!service) notFound();

  const canPublish = can(session.role, "content:publish");
  const canWrite = can(session.role, "content:write");

  const serviceId = service.id;

  async function handleCreatePage(_fd: FormData) {
    "use server";
    await createServicePage(serviceId);
  }

  async function handlePublishPage(_fd: FormData) {
    "use server";
    await publishServicePage(serviceId);
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/services" className="text-sm text-brand-dark hover:underline">
        ← All services
      </Link>

      <h1 className="text-2xl font-bold text-brand-dark">{service.title}</h1>

      <div className="grid grid-cols-5 gap-6">
        {/* Left panel — metadata */}
        <div className="col-span-2 space-y-4 rounded-xl border border-line bg-white p-6">
          <h2 className="text-sm font-semibold text-brand-dark">Service metadata</h2>
          <form action={updateServiceMetadata} className="space-y-4">
            <input type="hidden" name="id" value={service.id} />

            <label className="block">
              <span className="block text-xs font-medium text-ink-soft">Title *</span>
              <input
                name="title"
                required
                defaultValue={service.title}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-ink-soft">Slug *</span>
              <input
                name="slug"
                required
                defaultValue={service.slug}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-ink-soft">
                Excerpt <span className="text-ink-soft/60">(max 200 chars)</span>
              </span>
              <textarea
                name="excerpt"
                rows={3}
                maxLength={200}
                defaultValue={service.excerpt}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-ink-soft">
                Meta description <span className="text-ink-soft/60">(max 160 chars)</span>
              </span>
              <textarea
                name="metaDescription"
                rows={3}
                maxLength={160}
                defaultValue={service.metaDescription ?? ""}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-ink-soft">Icon name</span>
              <input
                name="iconName"
                defaultValue={service.iconName ?? ""}
                placeholder="Brain, HeartHandshake, Home…"
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                value="true"
                defaultChecked={service.isActive}
                className="rounded border-line"
              />
              <span className="text-ink-soft">Active (visible on site)</span>
            </label>

            {canWrite && (
              <button
                type="submit"
                className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90"
              >
                Save metadata
              </button>
            )}
          </form>
        </div>

        {/* Right panel — page editor or create CTA */}
        <div className="col-span-3">
          {service.page ? (
            <>
              <PageEditor
                page={{
                  id: service.page.id,
                  title: service.page.title,
                  slug: service.page.slug,
                  status: service.page.status,
                  seoTitle: service.page.seoTitle ?? "",
                  seoDescription: service.page.seoDescription ?? "",
                  canonicalUrl: service.page.canonicalUrl ?? "",
                  ogImageUrl: service.page.ogImageUrl ?? "",
                  template: service.page.template,
                  hasSidebar: service.page.hasSidebar,
                  defaultBlockSpacing: service.page.defaultBlockSpacing ?? "",
                }}
                initialBlocks={parseBlocks(service.page.versions[0]?.blocks)}
                canPublish={canPublish}
              />

              {canPublish && service.page.status !== "PUBLISHED" && (
                <div className="mt-4 border-t border-line pt-4">
                  <form action={handlePublishPage}>
                    <button
                      type="submit"
                      className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90"
                    >
                      Publish service page
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white p-12 text-center">
              <p className="text-sm font-semibold text-brand-dark">No page yet</p>
              <p className="mt-1 text-sm text-ink-soft">
                Generate a starter page with pre-built content blocks for this service.
              </p>
              {canWrite && (
                <form action={handleCreatePage} className="mt-4">
                  <button
                    type="submit"
                    className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90"
                  >
                    Create service page
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
