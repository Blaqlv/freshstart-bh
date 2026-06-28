// src/lib/medicaid/checklist-templates.ts
import type { CaseType } from "./constants";

export interface ChecklistTemplateItem {
  stepNumber: number;
  title: string;
  description: string;
  isRequired: boolean;
}

// Source: prompt v2.3.2. Ohio Department of Medicaid (ODM) behavioral-health
// enrollment. NOTE: surface the "review with your Medicaid enrollment specialist
// before real use — ODM updates requirements periodically" disclaimer in the UI.
export const initialEnrollmentChecklist: ChecklistTemplateItem[] = [
  { stepNumber: 1, title: "Verify active NPI", description: "Obtain or verify active NPI (National Provider Identifier) from NPPES.", isRequired: true },
  { stepNumber: 2, title: "Register in Ohio Medicaid Provider Network", description: "Register in the Ohio Medicaid Provider Network (MITS portal — Ohio MITS self-service).", isRequired: true },
  { stepNumber: 3, title: "ODHB certification application", description: "Complete the Ohio Department of Behavioral Health (ODHB) certification application if not already certified.", isRequired: true },
  { stepNumber: 4, title: "CARF / OhioMHAS accreditation", description: "Obtain CARF accreditation (or equivalent OhioMHAS-approved accreditation) or apply for provisional certification.", isRequired: true },
  { stepNumber: 5, title: "Liability insurance", description: "Obtain general and professional liability insurance meeting ODM minimums.", isRequired: true },
  { stepNumber: 6, title: "Background checks", description: "Complete background-check requirements for all clinical staff under ORC 109.572.", isRequired: true },
  { stepNumber: 7, title: "Submit W-9", description: "Submit W-9 to ODM.", isRequired: true },
  { stepNumber: 8, title: "Medicaid provider agreement", description: "Complete the Ohio Medicaid provider agreement (electronic signature via MITS).", isRequired: true },
  { stepNumber: 9, title: "Business entity registration", description: "Submit proof of business-entity registration with the Ohio Secretary of State.", isRequired: true },
  { stepNumber: 10, title: "NPI confirmation letter", description: "Submit the NPI confirmation letter.", isRequired: true },
  { stepNumber: 11, title: "Proof of physical address", description: "Submit proof of physical business address (utility bill or lease agreement).", isRequired: true },
  { stepNumber: 12, title: "Enroll in Managed Care plans", description: "Enroll in Medicaid Managed Care plans (Buckeye, CareSource, Paramount, Molina, Anthem, AmeriHealth, Aetna Better Health) separately via each MCO's provider portal.", isRequired: true },
  { stepNumber: 13, title: "EDI enrollment", description: "Complete EDI enrollment for electronic claims submission.", isRequired: true },
  { stepNumber: 14, title: "Verify active in MITS", description: "Verify enrollment is active in MITS before billing.", isRequired: true },
];

export const revalidationChecklist: ChecklistTemplateItem[] = [
  { stepNumber: 1, title: "Locate revalidation notification", description: "Log in to MITS and locate the revalidation notification.", isRequired: true },
  { stepNumber: 2, title: "Verify provider information", description: "Verify all provider information is current (address, NPI, taxonomy codes).", isRequired: true },
  { stepNumber: 3, title: "Update liability insurance", description: "Update liability-insurance certificates if expired.", isRequired: true },
  { stepNumber: 4, title: "Re-attest to provider agreement", description: "Re-attest to the provider agreement.", isRequired: true },
  { stepNumber: 5, title: "Updated background checks", description: "Submit updated background-check certifications if required.", isRequired: true },
  { stepNumber: 6, title: "Confirm MCO enrollments", description: "Confirm all MCO enrollments are still active.", isRequired: true },
  { stepNumber: 7, title: "Document completion", description: "Document the revalidation completion date and confirmation number.", isRequired: true },
];

/** Template for a case type; change_of_ownership has no prompt-supplied template (empty). */
export function checklistFor(caseType: CaseType): ChecklistTemplateItem[] {
  if (caseType === "initial_enrollment") return initialEnrollmentChecklist;
  if (caseType === "revalidation") return revalidationChecklist;
  return [];
}
