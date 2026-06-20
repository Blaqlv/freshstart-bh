import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * robots.txt — index the public marketing site; keep the authenticated/staff
 * surfaces (and anything touching PHI) out of search engines entirely.
 */
export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/patient-portal", "/intake", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
