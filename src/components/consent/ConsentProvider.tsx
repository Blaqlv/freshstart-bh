"use client";

import { ConsentContext, useConsentController } from "@/lib/consent";

/** Wraps the app so the banner, GTM gate, and footer settings link share state. */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const value = useConsentController();
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}
