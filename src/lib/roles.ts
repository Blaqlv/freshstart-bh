import type { Role } from "@prisma/client";

/** The 7 seeded SystemRole keys (super_admin + the 6 enum roles). */
export const ROLE_KEYS = [
  "super_admin",
  "administrator",
  "clinical_director",
  "compliance_officer",
  "receptionist",
  "provider",
  "billing_staff",
] as const;

/** Map the static Role enum to its SystemRole.key (lowercase). */
export function roleKeyFromEnum(role: Role): string {
  return role.toLowerCase();
}

/** A user's effective role key: a runtime customRoleKey overrides the enum. */
export function effectiveRoleKey(user: { role: Role; customRoleKey?: string | null }): string {
  return user.customRoleKey ?? roleKeyFromEnum(user.role);
}

/** Inverse of roleKeyFromEnum: a SystemRole.key → the static Role enum, or
 *  null for super_admin / custom / unknown keys. */
export function enumFromRoleKey(key: string): Role | null {
  const map: Record<string, Role> = {
    administrator: "ADMINISTRATOR",
    clinical_director: "CLINICAL_DIRECTOR",
    compliance_officer: "COMPLIANCE_OFFICER",
    receptionist: "RECEPTIONIST",
    provider: "PROVIDER",
    billing_staff: "BILLING_STAFF",
  };
  return map[key] ?? null;
}

export type RoleAssignmentPlan =
  | { kind: "builtin"; role: Role }
  | { kind: "custom" }
  | { kind: "reject" };

/** Decide how a submitted role key should be applied to a user. Pure — a
 *  "custom" result still needs DB validation that the role exists & is active. */
export function classifyRoleAssignment(
  key: string,
  opts: { viewerIsSuperAdmin: boolean },
): RoleAssignmentPlan {
  if (key === "super_admin") return { kind: "reject" }; // DB-only via the SP1 script
  const role = enumFromRoleKey(key);
  if (role) return { kind: "builtin", role };
  return opts.viewerIsSuperAdmin ? { kind: "custom" } : { kind: "reject" };
}
