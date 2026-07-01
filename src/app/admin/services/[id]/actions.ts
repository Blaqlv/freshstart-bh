"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { buildServicePageBlocks } from "@/lib/services/template";

export async function updateServiceMetadata(formData: FormData) {
  const session = await requireCapability("content:write");
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim().slice(0, 200);
  const metaDescription = (String(formData.get("metaDescription") ?? "").trim() || null) as string | null;
  const iconName = (String(formData.get("iconName") ?? "").trim() || null) as string | null;
  const isActive = formData.get("isActive") === "true";

  await db.service.update({ where: { id }, data: { title, slug, excerpt, metaDescription, iconName, isActive } });
  await audit({ sub: session.sub, email: session.email }, "service.update", "Service", id);
  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/admin/services");
}

export async function createServicePage(serviceId: string) {
  const session = await requireCapability("content:write");
  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
  if (service.pageId) throw new Error("This service already has a page.");

  const blocks = buildServicePageBlocks(service);

  const page = await db.page.create({
    data: {
      slug: `services/${service.slug}`,
      title: service.title,
      template: "SERVICE_DETAIL",
      hasSidebar: true,
      status: "DRAFT",
      seoTitle: `${service.title} | Fresh Start Behavioral Health`,
      seoDescription: (service.metaDescription ?? service.excerpt) || null,
      versions: {
        create: { version: 1, status: "DRAFT", blocks: blocks as object },
      },
    },
  });

  await db.service.update({ where: { id: serviceId }, data: { pageId: page.id } });
  await audit({ sub: session.sub, email: session.email }, "service.page_created", "Service", serviceId, { pageId: page.id });
  revalidatePath(`/admin/services/${serviceId}`);
  return { pageId: page.id };
}

export async function publishServicePage(serviceId: string) {
  const session = await requireCapability("content:publish");
  const service = await db.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: { page: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } } },
  });
  if (!service.pageId || !service.page) throw new Error("No page to publish.");
  const draft = service.page.versions[0];
  if (!draft) throw new Error("No version found.");

  await db.$transaction([
    db.pageVersion.update({ where: { id: draft.id }, data: { status: "PUBLISHED" } }),
    db.page.update({ where: { id: service.pageId }, data: { status: "PUBLISHED", publishedVersion: draft.version } }),
  ]);

  await audit({ sub: session.sub, email: session.email }, "service.page_published", "Service", serviceId);
  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath(`/services/${service.slug}`);
}
