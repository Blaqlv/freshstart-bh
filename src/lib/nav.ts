import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export type NavChild = { label: string; href: string; iconName?: string | null; target: string };
export type TopNavItem = { id: string; label: string; href?: string; iconName?: string | null; target: string; autoExpandServices: boolean; children: NavChild[] };
export type FooterColumn = NavChild[];
export type UtilityItem = { label: string; href: string; iconName?: string | null; target: string };
export type NavData = { topNav: TopNavItem[]; footerColumns: FooterColumn[]; utilityBar: UtilityItem[] };

function resolveHref(item: { href?: string | null; page?: { slug: string } | null; service?: { slug: string } | null }): string {
  if (item.service) return `/services/${item.service.slug}`;
  if (item.page) return `/${item.page.slug}`;
  return item.href ?? "#";
}

export const getNavigation = cache(async (): Promise<NavData> => {
  const [items, services] = await Promise.all([
    db.navigationItem.findMany({
      where: { isVisible: true },
      orderBy: [{ footerColumn: "asc" }, { sortOrder: "asc" }],
      include: {
        page: { select: { slug: true } },
        service: { select: { slug: true } },
        children: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
          include: { page: { select: { slug: true } }, service: { select: { slug: true } } },
        },
      },
    }),
    db.service.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, title: true, iconName: true } }),
  ]);

  const topNav: TopNavItem[] = items
    .filter((i) => i.placement === "TOP_NAV" && !i.parentId)
    .map((parent) => {
      const h = resolveHref(parent);
      return {
        id: parent.id,
        label: parent.label,
        href: h === "#" ? undefined : h,
        iconName: parent.iconName,
        target: parent.target,
        autoExpandServices: parent.autoExpandServices,
        children: parent.autoExpandServices
          ? services.map((s) => ({ label: s.title, href: `/services/${s.slug}`, iconName: s.iconName ?? null, target: "_self" }))
          : parent.children.map((c) => ({ label: c.label, href: resolveHref(c), iconName: c.iconName ?? null, target: c.target })),
      };
    });

  const footerItems = items.filter((i) => i.placement === "FOOTER");
  const maxCol = footerItems.reduce((m, i) => Math.max(m, i.footerColumn ?? 0), 0);
  const footerColumns: FooterColumn[] = Array.from({ length: maxCol + 1 }, (_, col) =>
    footerItems.filter((i) => (i.footerColumn ?? 0) === col).map((i) => ({ label: i.label, href: resolveHref(i), iconName: i.iconName ?? null, target: i.target }))
  );

  const utilityBar: UtilityItem[] = items
    .filter((i) => i.placement === "UTILITY_BAR")
    .map((i) => ({ label: i.label, href: resolveHref(i), iconName: i.iconName ?? null, target: i.target }));

  return { topNav, footerColumns, utilityBar };
});
