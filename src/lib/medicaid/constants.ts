// src/lib/medicaid/constants.ts
import { z } from "zod";

export const CASE_TYPES = ["initial_enrollment", "revalidation", "change_of_ownership"] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_STATUSES = [
  "not_started",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
  "pending_info",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const DOC_TYPES = [
  "NPI_letter",
  "W9",
  "liability_insurance",
  "DBH_cert",
  "CARF_cert",
  "corporate_docs",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_STATUSES = ["uploaded", "reviewed", "accepted", "rejected"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const MCO_STATUSES = ["not_started", "submitted", "approved", "rejected"] as const;
export type McoStatus = (typeof MCO_STATUSES)[number];

/** Allowed status transitions for a case. */
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["submitted"],
  submitted: ["approved", "rejected", "pending_info"],
  pending_info: ["submitted"],
  rejected: ["in_progress"],
  approved: [],
};

export function isValidTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function completionPercent(items: { isComplete: boolean }[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.isComplete).length;
  return Math.round((done / items.length) * 100);
}

// ---- Boundary validation (server actions) ----
export const newCaseSchema = z.object({
  providerName: z.string().trim().min(1, "Provider name is required"),
  providerNpi: z.string().trim().regex(/^\d{10}$/, "NPI must be 10 digits"),
  caseType: z.enum(CASE_TYPES),
  assignedTo: z.string().trim().optional(),
  targetDeadline: z.string().trim().optional(), // ISO date or ""
});
export type NewCaseInput = z.infer<typeof newCaseSchema>;
