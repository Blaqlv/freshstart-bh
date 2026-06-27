import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyRedirects } from "./src/lib/redirects";

// next-intl: cookie-based locale (no [locale] route segments). See src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Canonical production host, once a real domain is configured via
// NEXT_PUBLIC_SITE_URL. Every other host (preview deploys, *.vercel.app) gets a
// noindex header. Until a domain is set the site is pre-launch, so every host —
// including the live Vercel URL — is noindexed.
const PROD_HOST = process.env.NEXT_PUBLIC_SITE_URL
  ?.replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");
const PROD_HOST_RE = PROD_HOST ? `(www\\.)?${PROD_HOST.replace(/\./g, "\\.")}` : null;

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: true }));
  },
  async headers() {
    const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
    return [
      PROD_HOST_RE
        ? {
            // A real domain is set: noindex every host except it.
            source: "/:path*",
            missing: [{ type: "host", value: PROD_HOST_RE }],
            headers: [noindex],
          }
        : {
            // Pre-launch: no canonical domain yet, noindex the whole site.
            source: "/:path*",
            headers: [noindex],
          },
    ];
  },
};

export default withNextIntl(nextConfig);
