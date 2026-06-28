import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

type PermModule = { key: string; moduleKey: string };
type ModuleFlag = { key: string; isEnabled: boolean };
type AccessFlag = { moduleKey: string; canAccess: boolean };

/** Pure: filter granted permissions by enabled modules and module access. */
export function resolveEffectivePermissions(input: {
  grants: string[];
  permModule: PermModule[];
  modules: ModuleFlag[];
  access: AccessFlag[];
}): Set<string> {
  const enabled = new Set(input.modules.filter((m) => m.isEnabled).map((m) => m.key));
  const accessible = new Set(input.access.filter((a) => a.canAccess).map((a) => a.moduleKey));
  const moduleOf = new Map(input.permModule.map((p) => [p.key, p.moduleKey]));
  const out = new Set<string>();
  for (const g of input.grants) {
    const mk = moduleOf.get(g);
    if (!mk) continue;
    if (!enabled.has(mk)) continue;
    if (!accessible.has(mk)) continue;
    out.add(g);
  }
  return out;
}

/** DB-backed, memoized once per request (React cache). */
export const getEffectivePermissions = cache(async (roleKey: string): Promise<Set<string>> => {
  const [grants, modules, access, permModule] = await Promise.all([
    db.rolePermission.findMany({ where: { roleKey, granted: true }, select: { permissionKey: true } }),
    db.systemModule.findMany({ select: { key: true, isEnabled: true } }),
    db.moduleRoleAccess.findMany({ where: { roleKey }, select: { moduleKey: true, canAccess: true } }),
    db.permission.findMany({ select: { key: true, moduleKey: true } }),
  ]);
  return resolveEffectivePermissions({
    grants: grants.map((g) => g.permissionKey),
    permModule,
    modules,
    access,
  });
});

/** Is a single module globally enabled? Memoized per request. */
export const moduleIsEnabled = cache(async (moduleKey: string): Promise<boolean> => {
  const m = await db.systemModule.findUnique({ where: { key: moduleKey }, select: { isEnabled: true } });
  return m?.isEnabled ?? false;
});

/** Does this session hold a specific granular permission? */
export async function hasPermission(
  session: { isSuperAdmin?: boolean; roleKey: string },
  permissionKey: string,
): Promise<boolean> {
  if (session.isSuperAdmin) return true;
  const perms = await getEffectivePermissions(session.roleKey);
  return perms.has(permissionKey);
}
