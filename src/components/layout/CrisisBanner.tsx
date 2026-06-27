"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { crisisBanner } from "@/lib/constants";

const KEY = "fs-crisis-dismissed";

/**
 * Sitewide emergency banner. Dismissible, but reappears each new session
 * (uses sessionStorage, not localStorage) per the compliance requirement.
 */
export function CrisisBanner() {
  const [hidden, setHidden] = useState(true);
  // Locale-aware copy, still sourced from constants (never the DB) so the banner
  // stays resilient when data fetches fail (A12 + D2).
  const locale = useLocale();

  useEffect(() => {
    setHidden(sessionStorage.getItem(KEY) === "1");
  }, []);

  if (hidden) return null;

  return (
    <div role="alert" className="bg-accent text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 fill-current"
        >
          <path d="M12 2 1 21h22L12 2Zm0 5 7.53 13H4.47L12 7Zm-1 5v4h2v-4h-2Zm0 5v2h2v-2h-2Z" />
        </svg>
        <p className="flex-1 font-medium">{crisisBanner(locale)}</p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(KEY, "1");
            setHidden(true);
          }}
          className="rounded p-1 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Dismiss emergency notice for this session"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="m12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 5.3 5.3Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
