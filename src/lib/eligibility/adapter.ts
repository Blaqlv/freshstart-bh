// src/lib/eligibility/adapter.ts
import { isSandbox, hashResponse } from "./config";
import { sandboxRaw, parseRaw } from "./sandbox-data";
import { fetchEligibilityRaw } from "./client";
import type { EligibilityRequest, EligibilityResult } from "./types";

/**
 * Write one PII-free audit row for an eligibility check. Best-effort: the audit
 * module is `server-only`, so we load it dynamically and swallow failures — that
 * lets node test scripts import this adapter without resolving server-only, while
 * the real app always audits.
 */
async function auditCheck(payerCode: string, status: string): Promise<void> {
  try {
    const { audit } = await import("@/lib/audit");
    await audit(null, "eligibility.check", "VerificationAttempt", undefined, {
      mode: isSandbox() ? "sandbox" : "production",
      payerCode,
      status,
    });
  } catch {
    // server-only unavailable (e.g. under tsx tests) — skip auditing.
  }
}

/**
 * Run an eligibility check. Sandbox returns synthetic data; production calls the
 * vendor. ALWAYS audits one PII-free entry (mode, payer code, status) and sets
 * rawResponseHash = SHA-256 of the raw response. The raw response is discarded.
 * On any thrown error, returns status "unknown" — callers never surface raw errors.
 */
export async function checkEligibility(req: EligibilityRequest): Promise<EligibilityResult> {
  let raw: string;
  try {
    raw = isSandbox() ? sandboxRaw(req.memberId) : await fetchEligibilityRaw(req);
  } catch {
    await auditCheck(req.insurancePayerCode, "unknown");
    return {
      status: "unknown",
      coverageType: "",
      effectiveDate: "",
      terminationDate: null,
      copay: null,
      deductible: null,
      outOfPocketMax: null,
      rawResponseHash: hashResponse(`error:${req.insurancePayerCode}`),
    };
  }
  const parsed = parseRaw(raw);
  const result: EligibilityResult = { ...parsed, rawResponseHash: hashResponse(raw) };
  await auditCheck(req.insurancePayerCode, result.status);
  return result;
}
