"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type PortalNavItem = { label: string; href: string };

export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Patient portal" className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === "/patient-portal"
            ? pathname === "/patient-portal"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-brand-dark text-white" : "text-ink hover:bg-brand-tint",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
