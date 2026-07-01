"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { NavPlacement } from "@prisma/client";

function revalidateNav() {
  revalidatePath("/admin/navigation");
  revalidatePath("/api/v1/navigation");
}

export async function createNavItem(data: {
  label: string;
  href?: string;
  placement: NavPlacement;
  parentId?: string;
  footerColumn?: number;
  iconName?: string;
  target?: string;
}) {
  const session = await requireCapability("content:write");
  const agg = await db.navigationItem.aggregate({
    _max: { sortOrder: true },
    where: { placement: data.placement, parentId: data.parentId ?? null },
  });
  const item = await db.navigationItem.create({
    data: {
      label: data.label,
      href: data.href || null,
      placement: data.placement,
      parentId: data.parentId || null,
      footerColumn: data.footerColumn ?? null,
      iconName: data.iconName || null,
      target: data.target ?? "_self",
      sortOrder: (agg._max.sortOrder ?? 0) + 1,
    },
  });
  await audit({ sub: session.sub, email: session.email }, "nav.create", "NavigationItem", item.id);
  revalidateNav();
  return { id: item.id };
}

export async function updateNavItem(
  id: string,
  data: Partial<{ label: string; href: string | null; target: string; iconName: string | null; isVisible: boolean; footerColumn: number | null }>
) {
  const session = await requireCapability("content:write");
  await db.navigationItem.update({ where: { id }, data });
  await audit({ sub: session.sub, email: session.email }, "nav.update", "NavigationItem", id);
  revalidateNav();
}

export async function deleteNavItem(id: string) {
  const session = await requireCapability("content:write");
  await db.navigationItem.delete({ where: { id } });
  await audit({ sub: session.sub, email: session.email }, "nav.delete", "NavigationItem", id);
  revalidateNav();
}

export async function toggleNavItemVisibility(id: string, isVisible: boolean) {
  const session = await requireCapability("content:write");
  await db.navigationItem.update({ where: { id }, data: { isVisible } });
  await audit({ sub: session.sub, email: session.email }, isVisible ? "nav.show" : "nav.hide", "NavigationItem", id);
  revalidateNav();
}
