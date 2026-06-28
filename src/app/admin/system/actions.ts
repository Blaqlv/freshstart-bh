"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { effectiveRoleKey } from "@/lib/roles";
import { slugifyRoleKey, isBuiltInRoleKey, additivePermissionDiff } from "@/lib/system/helpers";

type Result = { ok: boolean; error?: string };

function revalidateSystem() {
  revalidatePath("/admin/system");
  revalidatePath("/admin/system/roles");
  revalidatePath("/admin/system/audit");
}

export async function toggleModule(key: string, enabled: boolean): Promise<Result> {
  const s = await requireSuperAdmin();
  const mod = await db.systemModule.findUnique({ where: { key } });
  if (!mod) return { ok: false, error: "Module not found." };
  if (!enabled && !mod.canDisable) return { ok: false, error: "This module is required and cannot be disabled." };
  if (mod.isEnabled === enabled) return { ok: true };
  await db.systemModule.update({ where: { key }, data: { isEnabled: enabled, updatedBy: s.sub } });
  await audit({ sub: s.sub, email: s.email }, enabled ? "system.module.enable" : "system.module.disable", "SystemModule", key, { target: mod.label, prev: mod.isEnabled, next: enabled });
  revalidateSystem();
  return { ok: true };
}

export async function setModuleRoleAccess(moduleKey: string, roleKey: string, canAccess: boolean): Promise<Result> {
  const s = await requireSuperAdmin();
  if (roleKey === "super_admin") return { ok: false, error: "Super Admin always has access." };
  await db.moduleRoleAccess.upsert({
    where: { moduleKey_roleKey: { moduleKey, roleKey } },
    update: { canAccess },
    create: { moduleKey, roleKey, canAccess },
  });
  await audit({ sub: s.sub, email: s.email }, "system.module.access", "SystemModule", moduleKey, { moduleKey, roleKey, next: canAccess });
  revalidateSystem();
  return { ok: true };
}

export async function createRole(input: { label: string; description: string; baseRoleKey?: string }): Promise<Result & { roleKey?: string }> {
  const s = await requireSuperAdmin();
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Label is required." };
  const key = slugifyRoleKey(label);
  if (!key) return { ok: false, error: "Label must contain letters or numbers." };
  if (await db.systemRole.findUnique({ where: { key } })) return { ok: false, error: `Role key "${key}" already exists.` };

  const modules = await db.systemModule.findMany({ select: { key: true } });
  let baseAccess = new Map<string, boolean>();
  let baseGrants: string[] = [];
  if (input.baseRoleKey) {
    const acc = await db.moduleRoleAccess.findMany({ where: { roleKey: input.baseRoleKey } });
    baseAccess = new Map(acc.map((a) => [a.moduleKey, a.canAccess]));
    baseGrants = (await db.rolePermission.findMany({ where: { roleKey: input.baseRoleKey, granted: true }, select: { permissionKey: true } })).map((r) => r.permissionKey);
  }

  await db.systemRole.create({ data: { key, label, description: input.description.trim(), isSystem: false, isActive: true, createdBy: s.sub } });
  // Seed ModuleRoleAccess for EVERY module — a role with no access rows resolves to zero permissions.
  await db.moduleRoleAccess.createMany({ data: modules.map((m) => ({ moduleKey: m.key, roleKey: key, canAccess: baseAccess.get(m.key) ?? true })) });
  if (baseGrants.length) {
    await db.rolePermission.createMany({ data: baseGrants.map((pk) => ({ roleKey: key, permissionKey: pk, granted: true })) });
  }
  await audit({ sub: s.sub, email: s.email }, "system.role.create", "SystemRole", key, { target: label, baseRole: input.baseRoleKey ?? null, next: "created" });
  revalidateSystem();
  return { ok: true, roleKey: key };
}

export async function updateRole(roleKey: string, input: { label: string; description: string }): Promise<Result> {
  const s = await requireSuperAdmin();
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Label is required." };
  const role = await db.systemRole.findUnique({ where: { key: roleKey } });
  if (!role) return { ok: false, error: "Role not found." };
  await db.systemRole.update({ where: { key: roleKey }, data: { label, description: input.description.trim() } });
  await audit({ sub: s.sub, email: s.email }, "system.role.update", "SystemRole", roleKey, { target: label, prev: role.label, next: label });
  revalidateSystem();
  return { ok: true };
}

export async function deactivateRole(roleKey: string): Promise<Result> {
  const s = await requireSuperAdmin();
  if (isBuiltInRoleKey(roleKey)) return { ok: false, error: "Built-in roles cannot be deactivated." };
  const users = await db.user.findMany({ select: { role: true, customRoleKey: true } });
  const count = users.filter((u) => effectiveRoleKey(u) === roleKey).length;
  if (count > 0) return { ok: false, error: `${count} user(s) hold this role — reassign them in User Management first.` };
  await db.systemRole.update({ where: { key: roleKey }, data: { isActive: false } });
  await audit({ sub: s.sub, email: s.email }, "system.role.deactivate", "SystemRole", roleKey, { prev: "active", next: "inactive" });
  revalidateSystem();
  return { ok: true };
}

export async function restoreRole(roleKey: string): Promise<Result> {
  const s = await requireSuperAdmin();
  await db.systemRole.update({ where: { key: roleKey }, data: { isActive: true } });
  await audit({ sub: s.sub, email: s.email }, "system.role.restore", "SystemRole", roleKey, { prev: "inactive", next: "active" });
  revalidateSystem();
  return { ok: true };
}

export async function setRolePermission(roleKey: string, permissionKey: string, granted: boolean): Promise<Result> {
  const s = await requireSuperAdmin();
  if (roleKey === "super_admin") return { ok: false, error: "Super Admin has unrestricted access and cannot be edited." };
  await db.rolePermission.upsert({
    where: { roleKey_permissionKey: { roleKey, permissionKey } },
    update: { granted, grantedBy: s.sub },
    create: { roleKey, permissionKey, granted, grantedBy: s.sub },
  });
  await audit({ sub: s.sub, email: s.email }, granted ? "system.permission.grant" : "system.permission.revoke", "SystemRole", roleKey, { roleKey, permissionKey, next: granted });
  revalidatePath(`/admin/system/roles/${roleKey}`);
  revalidatePath("/admin/system/audit");
  return { ok: true };
}

export async function copyRolePermissions(targetRoleKey: string, sourceRoleKey: string): Promise<Result & { added?: number }> {
  const s = await requireSuperAdmin();
  if (targetRoleKey === "super_admin") return { ok: false, error: "Super Admin cannot be edited." };
  if (targetRoleKey === sourceRoleKey) return { ok: false, error: "Pick a different source role." };
  const [targetGrants, sourceGrants] = await Promise.all([
    db.rolePermission.findMany({ where: { roleKey: targetRoleKey, granted: true }, select: { permissionKey: true } }),
    db.rolePermission.findMany({ where: { roleKey: sourceRoleKey, granted: true }, select: { permissionKey: true } }),
  ]);
  const toAdd = additivePermissionDiff(targetGrants.map((g) => g.permissionKey), sourceGrants.map((g) => g.permissionKey));
  for (const permissionKey of toAdd) {
    await db.rolePermission.upsert({
      where: { roleKey_permissionKey: { roleKey: targetRoleKey, permissionKey } },
      update: { granted: true, grantedBy: s.sub },
      create: { roleKey: targetRoleKey, permissionKey, granted: true, grantedBy: s.sub },
    });
  }
  await audit({ sub: s.sub, email: s.email }, "system.permission.copy", "SystemRole", targetRoleKey, { sourceRole: sourceRoleKey, addedKeys: toAdd, next: `+${toAdd.length}` });
  revalidatePath(`/admin/system/roles/${targetRoleKey}`);
  revalidatePath("/admin/system/audit");
  return { ok: true, added: toAdd.length };
}
