"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function list(v: FormDataEntryValue | null) {
  return String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function createProvider(formData: FormData) {
  const s = await requireCapability("providers:write");
  const name = String(formData.get("name") ?? "").trim() || "New provider";
  let slug = slugify(String(formData.get("slug") ?? "") || name);
  if (await db.provider.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const p = await db.provider.create({
    data: { name, slug, credentials: String(formData.get("credentials") ?? "") || null, title: String(formData.get("title") ?? "") || null },
  });
  await audit({ sub: s.sub, email: s.email }, "provider.create", "Provider", p.id);
  revalidatePath("/admin/providers");
  redirect(`/admin/providers/${p.id}`);
}

export async function updateProvider(formData: FormData) {
  const s = await requireCapability("providers:write");
  const id = String(formData.get("id"));
  await db.provider.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      credentials: String(formData.get("credentials") ?? "") || null,
      title: String(formData.get("title") ?? "") || null,
      bio: String(formData.get("bio") ?? "") || null,
      specializations: list(formData.get("specializations")),
      languages: list(formData.get("languages")),
      telehealth: formData.get("telehealth") === "on",
      availability: String(formData.get("availability") ?? "") || null,
      headshotUrl: String(formData.get("headshotUrl") ?? "") || null,
      status: formData.get("publish") === "on" ? "PUBLISHED" : "DRAFT",
    },
  });
  await audit({ sub: s.sub, email: s.email }, "provider.update", "Provider", id);
  revalidatePath("/admin/providers");
  revalidatePath(`/admin/providers/${id}`);
}

export async function deleteProvider(formData: FormData) {
  const s = await requireCapability("providers:write");
  const id = String(formData.get("id"));
  await db.provider.delete({ where: { id } });
  await audit({ sub: s.sub, email: s.email }, "provider.delete", "Provider", id);
  revalidatePath("/admin/providers");
  redirect("/admin/providers");
}
