import { listModulesWithEditors, listActiveRoles } from "@/lib/system/registry";
import { db } from "@/lib/db";
import { ModulesPanel } from "./ModulesPanel";

export const dynamic = "force-dynamic";

export default async function SystemModulesPage() {
  const [modules, roles, access] = await Promise.all([
    listModulesWithEditors(),
    listActiveRoles(),
    db.moduleRoleAccess.findMany({ select: { moduleKey: true, roleKey: true, canAccess: true } }),
  ]);

  return (
    <ModulesPanel
      modules={modules.map((m) => ({
        key: m.key, label: m.label, description: m.description, group: m.group,
        isEnabled: m.isEnabled, canDisable: m.canDisable, updatedAt: m.updatedAt, updatedByName: m.updatedByName,
      }))}
      roles={roles.map((r) => ({ key: r.key, label: r.label }))}
      access={access}
    />
  );
}
