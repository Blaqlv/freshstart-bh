import { listRoles, roleUserCounts } from "@/lib/system/registry";
import { RoleManager } from "./RoleManager";

export const dynamic = "force-dynamic";

export default async function SystemRolesPage() {
  const [roles, counts] = await Promise.all([listRoles(), roleUserCounts()]);
  return (
    <RoleManager
      roles={roles.map((r) => ({ key: r.key, label: r.label, description: r.description, isActive: r.isActive }))}
      counts={counts}
    />
  );
}
