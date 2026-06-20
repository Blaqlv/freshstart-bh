import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * XML sitemap generated from live content. Only public, indexable URLs are
 * included — the admin portal, analytics dashboard, patient portal, and intake
 * flow are intentionally excluded (and Disallowed in robots.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();

  const [pages, services, providers, locations, posts] = await Promise.all([
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.service.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.provider.findMany({ select: { slug: true, updatedAt: true } }),
    db.location.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.blogPost.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  const add = (path: string, lastModified: Date = now, priority = 0.6) => {
    const url = `${base}${path === "/" ? "" : path}` || base;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, lastModified, changeFrequency: "weekly", priority });
  };

  // Coded index/landing routes.
  add("/", now, 1);
  add("/services", now, 0.8);
  add("/providers", now, 0.7);
  add("/locations", now, 0.8);
  add("/insurance", now, 0.7);
  add("/reviews", now, 0.6);
  add("/reviews/leave-a-review", now, 0.4);
  add("/contact", now, 0.7);
  add("/resources/blog", now, 0.6);

  // CMS pages ("home" maps to "/").
  for (const p of pages) add(p.slug === "home" ? "/" : `/${p.slug}`, p.updatedAt, p.slug === "home" ? 1 : 0.6);
  for (const s of services) add(`/services/${s.slug}`, s.updatedAt, 0.7);
  for (const p of providers) add(`/providers/${p.slug}`, p.updatedAt, 0.6);
  for (const l of locations) add(`/locations/${l.slug}`, l.updatedAt, 0.7);
  for (const b of posts) add(`/resources/blog/${b.slug}`, b.updatedAt, 0.5);

  return entries;
}
