import type { PrismaClient } from "@prisma/client";
import { MODULES } from "./modules";
import { ROLES } from "./roles";
import { PERMISSIONS } from "./permissions";
import { deriveRolePermissions } from "../../src/lib/capability-map";
import { roleCapabilities } from "../../src/lib/rbac";

const NON_SUPER_ROLES = ["administrator", "clinical_director", "compliance_officer", "receptionist", "provider", "billing_staff"] as const;
const ROLE_ENUM_BY_KEY: Record<string, keyof typeof roleCapabilities> = {
  administrator: "ADMINISTRATOR",
  clinical_director: "CLINICAL_DIRECTOR",
  compliance_officer: "COMPLIANCE_OFFICER",
  receptionist: "RECEPTIONIST",
  provider: "PROVIDER",
  billing_staff: "BILLING_STAFF",
};

export async function seedSystem(db: PrismaClient): Promise<void> {
  // Modules — refresh metadata, preserve isEnabled.
  for (const m of MODULES) {
    await db.systemModule.upsert({
      where: { key: m.key },
      update: { label: m.label, description: m.description, group: m.group, canDisable: m.canDisable },
      create: { key: m.key, label: m.label, description: m.description, group: m.group, canDisable: m.canDisable },
    });
  }
  // Roles.
  for (const r of ROLES) {
    await db.systemRole.upsert({
      where: { key: r.key },
      update: { label: r.label, description: r.description, isSystem: r.isSystem },
      create: { key: r.key, label: r.label, description: r.description, isSystem: r.isSystem },
    });
  }
  // Permissions.
  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, description: p.description, moduleKey: p.moduleKey },
      create: { key: p.key, label: p.label, description: p.description, moduleKey: p.moduleKey },
    });
  }
  // Module-role access: default canAccess=true for every (module x non-super role).
  // Create only if missing — never reset an admin's restriction.
  for (const m of MODULES) {
    for (const roleKey of NON_SUPER_ROLES) {
      const existing = await db.moduleRoleAccess.findUnique({
        where: { moduleKey_roleKey: { moduleKey: m.key, roleKey } },
      });
      if (!existing) {
        await db.moduleRoleAccess.create({ data: { moduleKey: m.key, roleKey, canAccess: true } });
      }
    }
  }
  // Role permissions: DERIVED from capabilities so live access == static defaults.
  // Create only if missing — never reset a grant the Super Admin changed.
  for (const roleKey of NON_SUPER_ROLES) {
    const grants = deriveRolePermissions(ROLE_ENUM_BY_KEY[roleKey]);
    for (const permissionKey of grants) {
      const existing = await db.rolePermission.findUnique({
        where: { roleKey_permissionKey: { roleKey, permissionKey } },
      });
      if (!existing) {
        await db.rolePermission.create({ data: { roleKey, permissionKey, granted: true } });
      }
    }
  }
  // super_admin intentionally gets NO RolePermission rows (bypasses via flag).
}
