import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { site } from "@/lib/site";

/**
 * robots.txt — index the public marketing site on the canonical domain only.
 * On any other host (preview deploys, *.vercel.app) disallow everything so the
 * temporary URLs don't get indexed. Staff/PHI surfaces are always disallowed.
 */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = site.url.replace(/\/$/, "");
  const prodHost = new URL(base).host;
  const host = (await headers()).get("host") ?? "";
  const isProductionHost = host === prodHost || host === `www.${prodHost}`;

  if (!isProductionHost) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

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
