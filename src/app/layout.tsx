import type { Metadata } from "next";
import { Rubik } from "next/font/google";
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
  openGraph: { type: "website", siteName: site.name, locale: "en_US" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rubik.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ConsentProvider>
          {/* GTM loads only after analytics consent (A1). The <noscript> fallback
              is intentionally omitted: it would fire GTM without consent. */}
          <ConsentGatedScripts />
          {children}
          <CookieConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
