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
