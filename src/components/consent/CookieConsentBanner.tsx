"use client";

import { useState } from "react";
import Link from "next/link";
import { useConsent, type ConsentCategories } from "@/lib/consent";

/**
 * Cookie consent banner + preferences modal (A1).
 *
 * Fixed bottom bar shown until the visitor decides. "Manage Preferences" (and
 * the footer "Cookie Settings" link, via openManager) opens a modal with a
 * per-category toggle. Sits above page content but below the crisis banner.
 */
export function CookieConsentBanner() {
  const { consent, managerOpen, acceptAll, rejectNonEssential, savePreferences, openManager, closeManager } =
    useConsent();

  const showBar = !consent.decided && !managerOpen;

  return (
    <>
      {showBar && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-white shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <p className="text-sm text-ink-soft">
              We use cookies to improve your experience. Analytics and marketing cookies are only
              activated with your consent.{" "}
              <Link href="/privacy/cookie-policy" className="font-medium text-brand-dark underline">
                Cookie Policy
              </Link>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-tint"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={openManager}
                className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-tint"
              >
                Manage Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {managerOpen && <PreferencesModal initial={consent} onSave={savePreferences} onClose={closeManager} />}
    </>
  );
}

function PreferencesModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ConsentCategories;
  onSave: (c: ConsentCategories) => void;
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [marketing, setMarketing] = useState(initial.marketing);
  const [functional, setFunctional] = useState(initial.functional);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="cookie-prefs-title" className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
        <h2 id="cookie-prefs-title" className="text-xl font-bold text-brand-dark">
          Cookie Preferences
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Essential cookies are always on so the site works. Choose which optional categories to allow.
        </p>

        <div className="mt-5 space-y-4">
          <ToggleRow
            label="Strictly Necessary"
            description="Required for security and core functionality. Always active."
            checked
            disabled
          />
          <ToggleRow
            label="Functional"
            description="Remembers preferences such as language and chat state."
            checked={functional}
            onChange={setFunctional}
          />
          <ToggleRow
            label="Analytics"
            description="Helps us understand how the site is used (Google Tag Manager / GA4)."
            checked={analytics}
            onChange={setAnalytics}
          />
          <ToggleRow
            label="Marketing"
            description="Used to measure and improve outreach campaigns."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-tint"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics, marketing, functional })}
            className="rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    </label>
  );
}
