/**
 * Crisis-critical constants (A12).
 *
 * These values must NEVER be loaded from the database. A patient in crisis has
 * to be able to see how to get help even if every DB read on the page fails, so
 * the crisis banner and the primary phone number are hard-coded here and the
 * banner renders from these constants — not from a CMS query.
 *
 * Do not add a runtime dependency (DB, network, env that can be unset) to this
 * file. site.ts and the crisis banner import from here.
 */

/** Primary phone number, shown on every error/crisis surface. */
export const CRISIS_PHONE = "937-579-0073";
export const CRISIS_PHONE_HREF = "tel:+19375790073";

/** 911 emergency banner copy. */
export const CRISIS_BANNER_EN =
  "If you are experiencing a mental health emergency, call 911 or go to your nearest emergency department.";

// NEEDS HUMAN REVIEW — machine-assisted Spanish; confirm with bilingual clinical
// staff before relying on it in production (see Part D / D2).
export const CRISIS_BANNER_ES =
  "Si está experimentando una emergencia de salud mental, llame al 911 o vaya al departamento de emergencias más cercano.";

/** Default (English) banner text. */
export const CRISIS_BANNER = CRISIS_BANNER_EN;

/** Locale-aware lookup for the banner copy. */
export function crisisBanner(locale: string): string {
  return locale === "es" ? CRISIS_BANNER_ES : CRISIS_BANNER_EN;
}
