// src/lib/eligibility/sandbox-data.ts
import type { EligibilityResult } from "./types";

/**
 * Deterministic synthetic eligibility keyed off memberId so the whole flow is
 * testable with no vendor. No real PHI. `sandboxRaw` returns a raw JSON string
 * (the adapter hashes it); `parseRaw` maps a raw string to a result minus the hash.
 */
export function sandboxRaw(memberId: string): string {
  if (memberId.includes("0000")) throw new Error("sandbox: simulated vendor error");
  const digits = memberId.replace(/\D/g, "");
  if (digits.length === 0) {
    return JSON.stringify({ status: "unknown" });
  }
  const odd = Number(digits[digits.length - 1]) % 2 === 1;
  return JSON.stringify(
    odd
      ? {
          status: "active",
          coverageType: "PPO Behavioral Health",
          effectiveDate: "2026-01-01",
          terminationDate: null,
          copay: "$25",
          deductible: "$500",
          outOfPocketMax: "$3000",
        }
      : { status: "inactive", coverageType: "", effectiveDate: "", terminationDate: null, copay: null, deductible: null, outOfPocketMax: null },
  );
}

export function parseRaw(raw: string): Omit<EligibilityResult, "rawResponseHash"> {
  const j = JSON.parse(raw) as Partial<EligibilityResult>;
  const status = j.status === "active" || j.status === "inactive" ? j.status : "unknown";
  return {
    status,
    coverageType: j.coverageType ?? "",
    effectiveDate: j.effectiveDate ?? "",
    terminationDate: j.terminationDate ?? null,
    copay: j.copay ?? null,
    deductible: j.deductible ?? null,
    outOfPocketMax: j.outOfPocketMax ?? null,
  };
}
