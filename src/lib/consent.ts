"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Self-hosted cookie consent store (A1).
 *
 * No third-party consent SDK (which would itself set cookies before consent).
 * State is a plain React context persisted to localStorage. Until the visitor
 * makes a choice, `decided` is false and no non-essential script category is
 * active — the banner shows and GTM/analytics stay off.
 */

export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

export type ConsentState = ConsentCategories & { decided: boolean };

const STORAGE_KEY = "fsbh_consent_v1";

const DENIED: ConsentState = {
  analytics: false,
  marketing: false,
  functional: false,
  decided: false,
};

type ConsentContextValue = {
  consent: ConsentState;
  managerOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (categories: ConsentCategories) => void;
  openManager: () => void;
  closeManager: () => void;
};

export const ConsentContext = createContext<ConsentContextValue | null>(null);

function read(): ConsentState {
  if (typeof window === "undefined") return DENIED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DENIED;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      functional: Boolean(parsed.functional),
      decided: true,
    };
  } catch {
    return DENIED;
  }
}

/** Hook backing <ConsentProvider>. */
export function useConsentController(): ConsentContextValue {
  const [consent, setConsent] = useState<ConsentState>(DENIED);
  const [managerOpen, setManagerOpen] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setConsent(read());
  }, []);

  const persist = useCallback((next: ConsentState) => {
    setConsent(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  }, []);

  const acceptAll = useCallback(
    () => persist({ analytics: true, marketing: true, functional: true, decided: true }),
    [persist],
  );
  const rejectNonEssential = useCallback(
    () => persist({ analytics: false, marketing: false, functional: false, decided: true }),
    [persist],
  );
  const savePreferences = useCallback(
    (c: ConsentCategories) => {
      persist({ ...c, decided: true });
      setManagerOpen(false);
    },
    [persist],
  );

  return useMemo(
    () => ({
      consent,
      managerOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openManager: () => setManagerOpen(true),
      closeManager: () => setManagerOpen(false),
    }),
    [consent, managerOpen, acceptAll, rejectNonEssential, savePreferences],
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within <ConsentProvider>");
  return ctx;
}
