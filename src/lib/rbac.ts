import type { Role } from "@prisma/client";

/**
 * Capability-based RBAC. Routes and data-access checks both consult `can()`
 * so authorization is never enforced by UI hiding alone (per the brief).
 */
export type Capability =
  | "content:read"
  | "content:write"
  | "content:publish"
  | "providers:write"
  | "testimonials:write"
  | "forms:manage"
  | "users:manage"
  | "audit:read"
  | "incidents:manage"
  | "dashboard:read"
  | "billing:manage"
  | "appointments:read"
  | "patients:read"
  | "patients:manage"
  | "enrollment:read"
  | "enrollment:manage";

const ALL: Capability[] = [
  "content:read",
  "content:write",
  "content:publish",
  "providers:write",
  "testimonials:write",
  "forms:manage",
  "users:manage",
  "audit:read",
  "incidents:manage",
  "dashboard:read",
  "billing:manage",
  "appointments:read",
  "patients:read",
  "patients:manage",
  "enrollment:read",
  "enrollment:manage",
];

export const roleCapabilities: Record<Role, Capability[]> = {
  ADMINISTRATOR: ALL,
  CLINICAL_DIRECTOR: [
    "content:read",
    "content:write",
    "content:publish",
    "providers:write",
    "dashboard:read",
    "incidents:manage",
    "patients:read",
    "enrollment:read",
  ],
  COMPLIANCE_OFFICER: ["content:read", "audit:read", "incidents:manage", "dashboard:read", "enrollment:read", "enrollment:manage"],
  RECEPTIONIST: ["content:read", "content:write", "appointments:read"],
  PROVIDER: ["content:read", "providers:write"],
  BILLING_STAFF: ["content:read", "billing:manage", "appointments:read"],
};

export function can(role: Role, capability: Capability): boolean {
  return roleCapabilities[role]?.includes(capability) ?? false;
}

export const roleLabels: Record<Role, string> = {
  ADMINISTRATOR: "Administrator",
  CLINICAL_DIRECTOR: "Clinical Director",
  COMPLIANCE_OFFICER: "Compliance Officer",
  RECEPTIONIST: "Receptionist",
  PROVIDER: "Provider",
  BILLING_STAFF: "Billing Staff",
};
