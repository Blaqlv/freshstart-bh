// src/lib/eligibility/config.ts
// NOTE: intentionally NOT `server-only`. This module holds pure helpers (mode +
// SHA-256 hashing, non-public env reads) and is imported by node test scripts; it
// holds no secrets that would leak to a client bundle. The DB/audit layers it feeds
// remain server-only.
import crypto from "node:crypto";

/**
 * Eligibility mode. Defaults to "sandbox" (synthetic results, no vendor call) and
 * is only "production" when ELIGIBILITY_MODE is explicitly set. Vendor/key presence
 * is validated in the client, not here, so the mode gate stays simple and testable.
 */
export function eligibilityMode(): "sandbox" | "production" {
  return process.env.ELIGIBILITY_MODE === "production" ? "production" : "sandbox";
}
export function isSandbox(): boolean {
  return eligibilityMode() === "sandbox";
}
/** SHA-256 hex of a raw vendor response — the only thing we keep from it. */
export function hashResponse(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
export function eligibilityEnv() {
  return {
    apiKey: process.env.ELIGIBILITY_API_KEY,
    baseUrl: process.env.ELIGIBILITY_API_BASE_URL,
    vendor: process.env.ELIGIBILITY_API_VENDOR,
  };
}
