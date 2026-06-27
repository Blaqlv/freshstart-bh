"use client";

import { useConsent } from "@/lib/consent";

/**
 * Footer "Cookie Settings" link (A1). Re-opens the preferences modal even after
 * the banner has been dismissed, so consent can always be withdrawn or changed.
 */
export function CookieSettingsLink({ className }: { className?: string }) {
  const { openManager } = useConsent();
  return (
    <button type="button" onClick={openManager} className={className}>
      Cookie Settings
    </button>
  );
}
