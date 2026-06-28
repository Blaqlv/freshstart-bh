import { db } from "@/lib/db";
import { effectiveRoleKey } from "@/lib/roles";
import { getEffectivePermissions } from "@/lib/permissions";
import { isBuiltInRoleKey } from "@/lib/system/helpers";

/** All modules with their last-editor display name resolved. */
export async function listModulesWithEditors() {
  const modules = await db.systemModule.findMany({ orderBy: { label: "asc" } });
  const ids = [...new Set(modules.map((m) => m.updatedBy).filter((x): x is string => Boolean(x)))];
  const editors = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(editors.map((e) => [e.id, e.name]));
  return modules.map((m) => ({
    ...m,
    updatedByName: m.updatedBy ? nameById.get(m.updatedBy) ?? null : null,
  }));
}

/** Effective-role-key -> user count, across the (small) staff table. */
export async function roleUserCounts(): Promise<Record<string, number>> {
  const users = await db.user.findMany({ select: { role: true, customRoleKey: true } });
  const counts: Record<string, number> = {};
  for (const u of users) {
    const key = effectiveRoleKey(u);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export async function listRoles() {
  return db.systemRole.findMany({ orderBy: [{ isActive: "desc" }, { label: "asc" }] });
}

export async function listActiveRoles() {
  return db.systemRole.findMany({ where: { isActive: true }, orderBy: { label: "asc" } });
}

export async function getRole(roleKey: string) {
  return db.systemRole.findUnique({ where: { key: roleKey } });
}

export async function getRoleGrants(roleKey: string): Promise<string[]> {
  const rows = await db.rolePermission.findMany({
    where: { roleKey, granted: true },
    select: { permissionKey: true },
  });
  return rows.map((r) => r.permissionKey);
}

export async function listPermissions() {
  return db.permission.findMany({ orderBy: { key: "asc" } });
}

export async function listSystemAudit(take = 500) {
  return db.auditLog.findMany({
    where: { action: { startsWith: "system." } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export type AssignableRole = {
  key: string;
  label: string;
  isBuiltin: boolean;
  permissionLabels: string[];
};

/** Active roles a user can be assigned (excludes super_admin), each with a
 *  human-readable summary of the permissions it grants (Prompt 3 §6.1). */
export async function assignableRoles(): Promise<AssignableRole[]> {
  const roles = await db.systemRole.findMany({
    where: { isActive: true, key: { not: "super_admin" } },
    orderBy: { label: "asc" },
  });
  const perms = await db.permission.findMany({ select: { key: true, label: true } });
  const labelByKey = new Map(perms.map((p) => [p.key, p.label]));

  const out: AssignableRole[] = [];
  for (const r of roles) {
    const granted = await getEffectivePermissions(r.key);
    const permissionLabels = [...granted].map((k) => labelByKey.get(k) ?? k).sort();
    out.push({ key: r.key, label: r.label, isBuiltin: isBuiltInRoleKey(r.key), permissionLabels });
  }
  return out;
}
