"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBlocks } from "@/lib/cms/blocks";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createPage(formData: FormData) {
  const session = await requireCapability("content:write");
  const title = String(formData.get("title") ?? "").trim() || "Untitled page";
  const slug = slugify(String(formData.get("slug") ?? "") || title);

  const existing = await db.page.findUnique({ where: { slug } });
  if (existing) {
    redirect(`/admin/pages/${existing.id}`);
  }

  const page = await db.page.create({
    data: {
      title,
      slug,
      status: "DRAFT",
      versions: { create: { version: 1, status: "DRAFT", blocks: [] } },
    },
  });
  await audit({ sub: session.sub, email: session.email }, "page.create", "Page", page.id, { slug });
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${page.id}`);
}

/** Returns the editable draft version, creating one if the latest is published. */
async function ensureDraft(pageId: string) {
  const latest = await db.pageVersion.findFirst({
    where: { pageId },
    orderBy: { version: "desc" },
  });
  if (latest && latest.status === "DRAFT") return latest;
  const nextVersion = (latest?.version ?? 0) + 1;
  return db.pageVersion.create({
    data: {
      pageId,
      version: nextVersion,
      status: "DRAFT",
      blocks: latest ? (latest.blocks as object) : [],
    },
  });
}

/** Persists title/SEO/blocks onto the working draft. Returns the draft. */
async function persistDraft(formData: FormData, pageId: string) {
  const title = String(formData.get("title") ?? "").trim();
  const blocks = parseBlocks(JSON.parse(String(formData.get("blocks") ?? "[]")));
  const draft = await ensureDraft(pageId);
  await db.$transaction([
    db.page.update({
      where: { id: pageId },
      data: {
        title: title || undefined,
        seoTitle: (String(formData.get("seoTitle") ?? "") || null) as string | null,
        seoDescription: (String(formData.get("seoDescription") ?? "") || null) as string | null,
        canonicalUrl: (String(formData.get("canonicalUrl") ?? "") || null) as string | null,
        ogImageUrl: (String(formData.get("ogImageUrl") ?? "") || null) as string | null,
        template:
          String(formData.get("template")) === "SERVICE_DETAIL" ? "SERVICE_DETAIL" : "GENERAL",
        hasSidebar: String(formData.get("hasSidebar")) === "true",
      },
    }),
    db.pageVersion.update({ where: { id: draft.id }, data: { blocks: blocks as object } }),
  ]);
  return { draft, blockCount: blocks.length };
}

export async function savePage(formData: FormData) {
  const session = await requireCapability("content:write");
  const pageId = String(formData.get("pageId"));
  const { draft, blockCount } = await persistDraft(formData, pageId);
  await audit({ sub: session.sub, email: session.email }, "page.save", "Page", pageId, {
    version: draft.version,
    blocks: blockCount,
  });
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}

export async function autosavePage(formData: FormData): Promise<{ savedAt: string }> {
  const session = await requireCapability("content:write");
  const pageId = String(formData.get("pageId"));
  const { draft, blockCount } = await persistDraft(formData, pageId);
  await audit({ sub: session.sub, email: session.email }, "page.autosave", "Page", pageId, {
    version: draft.version,
    blocks: blockCount,
  });
  revalidatePath(`/admin/pages/${pageId}`);
  return { savedAt: new Date().toISOString() };
}

export async function publishPage(formData: FormData) {
  const session = await requireCapability("content:publish");
  const pageId = String(formData.get("pageId"));
  // Save whatever is in the editor, then publish that draft.
  const { draft } = await persistDraft(formData, pageId);
  await db.$transaction([
    db.pageVersion.update({ where: { id: draft.id }, data: { status: "PUBLISHED" } }),
    db.page.update({
      where: { id: pageId },
      data: { status: "PUBLISHED", publishedVersion: draft.version },
    }),
  ]);
  await audit({ sub: session.sub, email: session.email }, "page.publish", "Page", pageId, {
    version: draft.version,
  });
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}

export async function unpublishPage(formData: FormData) {
  const session = await requireCapability("content:publish");
  const pageId = String(formData.get("pageId"));
  await db.page.update({ where: { id: pageId }, data: { status: "DRAFT", publishedVersion: null } });
  await audit({ sub: session.sub, email: session.email }, "page.unpublish", "Page", pageId);
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}

export async function deletePage(formData: FormData) {
  const session = await requireCapability("content:publish");
  const pageId = String(formData.get("pageId"));
  await db.page.delete({ where: { id: pageId } });
  await audit({ sub: session.sub, email: session.email }, "page.delete", "Page", pageId);
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}
