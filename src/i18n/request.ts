import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

/**
 * next-intl request config (D1).
 *
 * Cookie-based locale (NEXT_LOCALE) rather than path-based ([locale] segments),
 * to add Spanish without restructuring every existing route. The language toggle
 * sets the cookie; this resolves it per request and loads the matching catalog.
 */
export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale: Locale = cookieLocale === "es" ? "es" : "en";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
