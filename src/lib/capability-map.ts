import type { Capability } from "@/lib/rbac";
import { roleCapabilities } from "@/lib/rbac";

/** Capability -> the permission key(s) that must ALL be granted for it. */
export const CAPABILITY_PERMISSIONS: Record<Capability, string[]> = {
  "content:read": ["cms.view_pages"],
  "content:write": ["cms.edit_pages"],
  "content:publish": ["cms.publish_pages"],
  "providers:write": ["providers.manage"],
  "testimonials:write": ["reviews.moderate"],
  "forms:manage": ["forms.manage"],
  "users:manage": ["users.manage"],
  "audit:read": ["audit_log.view"],
  "incidents:manage": ["incident_reporting.manage"],
  "dashboard:read": ["analytics.view"],
  "billing:manage": ["billing.manage"],
  "appointments:read": ["appointments.view_requests"],
  "patients:read": ["patients.view"],
  "patients:manage": ["patients.manage"],
  "enrollment:read": ["medicaid_enrollment.view"],
  "enrollment:manage": ["medicaid_enrollment.manage"],
};

/** Derive default permission grants for a role from its static capabilities. */
export function deriveRolePermissions(roleEnumKey: keyof typeof roleCapabilities): string[] {
  const caps = roleCapabilities[roleEnumKey] ?? [];
  const out = new Set<string>();
  for (const cap of caps) for (const p of CAPABILITY_PERMISSIONS[cap] ?? []) out.add(p);
  return [...out];
}

/** Given a granted-permission set, which capabilities does it satisfy? */
export function capabilitiesFromPermissions(granted: Set<string>): Capability[] {
  return (Object.keys(CAPABILITY_PERMISSIONS) as Capability[]).filter((cap) =>
    CAPABILITY_PERMISSIONS[cap].every((p) => granted.has(p)),
  );
}
