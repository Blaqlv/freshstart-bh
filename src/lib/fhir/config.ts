// src/lib/fhir/config.ts
import "server-only";
import crypto from "crypto";

/**
 * EHR integration mode. Defaults to "sandbox" so no real PHI can ever be reached
 * unless EHR_MODE is explicitly set to "production" (Vercel Production env only).
 */
export function ehrMode(): "sandbox" | "production" {
  return process.env.EHR_MODE === "production" ? "production" : "sandbox";
}

export function isSandbox(): boolean {
  return ehrMode() === "sandbox";
}

/** sha256 of a FHIR patient id — the only patient identifier ever written to the audit log. */
export function hashPatientId(fhirPatientId: string): string {
  return crypto.createHash("sha256").update(fhirPatientId).digest("hex");
}

/** Production endpoint config. Throws if production mode is on but vars are missing. */
export function ehrEnv() {
  const baseUrl = process.env.EHR_FHIR_BASE_URL;
  const clientId = process.env.EHR_CLIENT_ID;
  const clientSecret = process.env.EHR_CLIENT_SECRET;
  const tokenUrl = process.env.EHR_OAUTH_TOKEN_URL;
  const scope = process.env.EHR_FHIR_SCOPE ?? "patient/*.read launch/patient openid";
  if (!isSandbox() && (!baseUrl || !clientId || !clientSecret || !tokenUrl)) {
    throw new Error("EHR production mode requires EHR_FHIR_BASE_URL/CLIENT_ID/CLIENT_SECRET/OAUTH_TOKEN_URL");
  }
  return { baseUrl, clientId, clientSecret, tokenUrl, scope };
}
