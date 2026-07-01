import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [services, pages, locations] = await Promise.all([
    db.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true },
    }),
    db.page.findMany({
      where: { status: "PUBLISHED", template: "GENERAL" },
      orderBy: { title: "asc" },
      select: { slug: true, title: true },
    }),
    db.location.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  return NextResponse.json({
    services: services.map((s) => ({ label: s.title, href: `/services/${s.slug}`, group: "Services" })),
    pages: pages.map((p) => ({ label: p.title, href: `/${p.slug}`, group: "Pages" })),
    locations: locations.map((l) => ({ label: l.name, href: `/locations/${l.slug}`, group: "Locations" })),
    anchors: [
      { label: "Contact Form", href: "#contact-form", group: "Anchors" },
      { label: "Top of Page", href: "#top", group: "Anchors" },
    ],
  });
}
