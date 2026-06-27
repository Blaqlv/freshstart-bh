import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { site } from "@/lib/site";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { ConsentGatedScripts } from "@/components/consent/ConsentGatedScripts";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Fresh Start Behavioral Health | Dayton & Cincinnati, OH",
    template: "%s | Fresh Start Behavioral Health",
  },
  description:
    "Fresh Start Behavioral Health provides personalized mental health, substance use, and psychiatric treatment across Dayton, Cincinnati, and Milford, OH.",
  openGraph: { type: "website", siteName: site.name, locale: "en_US", url: site.url },
  // twitter:card site-wide; the card image falls back to the root opengraph-image (B1).
  twitter: { card: "summary_large_image", site: undefined },
  alternates: {
    // hreflang (D1). Localization is cookie-based (no /es/ path), so EN and the
    // x-default share the canonical URL; the toggle switches content in place.
    languages: { en: "/", "x-default": "/" },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${rubik.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConsentProvider>
            {/* GTM loads only after analytics consent (A1). The <noscript> fallback
                is intentionally omitted: it would fire GTM without consent. */}
            <ConsentGatedScripts />
            {children}
            <CookieConsentBanner />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
