"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function createService(formData: FormData) {
  const session = await requireCapability("content:write");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const maxOrder = await db.service.aggregate({ _max: { sortOrder: true } });
  const nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;
  const service = await db.service.create({
    data: {
      title,
      slug,
      excerpt: "",
      sortOrder: nextOrder,
      order: nextOrder,
      isActive: true,
      status: "DRAFT",
    },
  });
  await audit({ sub: session.sub, email: session.email }, "service.create", "Service", service.id, { slug });
  revalidatePath("/admin/services");
  return { id: service.id };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  const session = await requireCapability("content:write");
  await db.service.update({ where: { id }, data: { isActive } });
  await audit({ sub: session.sub, email: session.email }, isActive ? "service.activate" : "service.deactivate", "Service", id);
  revalidatePath("/admin/services");
}

export async function reorderServices(orderedIds: string[]) {
  const session = await requireCapability("content:write");
  await db.$transaction(
    orderedIds.map((id, idx) => db.service.update({ where: { id }, data: { sortOrder: idx + 1, order: idx + 1 } }))
  );
  await audit({ sub: session.sub, email: session.email }, "service.reorder", "Service", undefined, { count: orderedIds.length });
  revalidatePath("/admin/services");
}
