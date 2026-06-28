export type RoleSeed = { key: string; label: string; description: string; isSystem: boolean };

export const ROLES: RoleSeed[] = [
  { key: "super_admin", label: "Super Admin", description: "Highest privilege; bypasses all checks.", isSystem: true },
  { key: "administrator", label: "Administrator", description: "Full administrative access.", isSystem: true },
  { key: "clinical_director", label: "Clinical Director", description: "Clinical oversight.", isSystem: false },
  { key: "compliance_officer", label: "Compliance Officer", description: "Audit & compliance.", isSystem: false },
  { key: "receptionist", label: "Receptionist", description: "Front-desk operations.", isSystem: false },
  { key: "provider", label: "Provider", description: "Clinical provider.", isSystem: false },
  { key: "billing_staff", label: "Billing Staff", description: "Billing operations.", isSystem: false },
];
