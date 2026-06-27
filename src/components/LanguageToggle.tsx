"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

/**
 * EN | ES language toggle (D1). Persists the choice in the NEXT_LOCALE cookie so
 * it survives navigation, then refreshes server components to re-render in the
 * chosen locale.
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: "en" | "es") {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  const btn = (l: "en" | "es", label: string) => (
    <button
      type="button"
      onClick={() => set(l)}
      aria-pressed={locale === l}
      disabled={pending}
      className={
        "rounded px-1.5 py-0.5 text-sm font-semibold " +
        (locale === l ? "text-brand-dark underline" : "text-ink-soft hover:text-brand-dark")
      }
    >
      {label}
    </button>
  );

  return (
    <div className={"flex items-center gap-1 " + className} aria-label={t("label")}>
      {btn("en", t("toggleEn"))}
      <span aria-hidden className="text-line">|</span>
      {btn("es", t("toggleEs"))}
    </div>
  );
}
