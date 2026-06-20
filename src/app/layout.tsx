import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { site } from "@/lib/site";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://freshstartbhinc.com"),
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
        {/* Google Tag Manager — preserve analytics continuity (see BRAND.md) */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${site.gtmId}');`}
        </Script>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${site.gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="gtm"
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
