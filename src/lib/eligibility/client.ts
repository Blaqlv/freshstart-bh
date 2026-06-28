// src/lib/eligibility/client.ts
import { eligibilityEnv } from "./config";
import type { EligibilityRequest } from "./types";

/**
 * Production vendor call. Returns the RAW response text; the adapter hashes + parses
 * it. Vendor-specific request/response mapping is finalized when a vendor is chosen;
 * this is the generic shape (POST JSON, bearer auth).
 */
export async function fetchEligibilityRaw(req: EligibilityRequest): Promise<string> {
  const { apiKey, baseUrl } = eligibilityEnv();
  if (!apiKey || !baseUrl) throw new Error("eligibility production env not configured");
  const res = await fetch(`${baseUrl}/eligibility`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`eligibility vendor ${res.status}`);
  return res.text();
}
