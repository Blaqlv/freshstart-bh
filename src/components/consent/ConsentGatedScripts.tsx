"use client";

import Script from "next/script";
import { useConsent } from "@/lib/consent";
import { site } from "@/lib/site";

/**
 * Google Tag Manager, gated behind analytics consent (A1). On first visit, and
 * for any visitor who has not granted analytics consent, GTM never loads — no
 * <script> tag, no dataLayer, no cookies. It mounts only once
 * consent.analytics === true.
 */
export function ConsentGatedScripts() {
  const { consent } = useConsent();
  if (!consent.analytics) return null;

  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${site.gtmId}');`}
    </Script>
  );
}
