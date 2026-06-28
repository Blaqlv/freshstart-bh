// src/lib/eligibility/types.ts
export interface EligibilityRequest {
  patientFirstName: string;
  patientLastName: string;
  patientDob: string; // YYYY-MM-DD
  memberId: string;
  insurancePayerCode: string;
}

export interface EligibilityResult {
  status: "active" | "inactive" | "unknown";
  coverageType: string;
  effectiveDate: string;
  terminationDate: string | null;
  copay: string | null;
  deductible: string | null;
  outOfPocketMax: string | null;
  rawResponseHash: string; // SHA-256 of the raw response — never the response itself
}
