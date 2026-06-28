import Link from "next/link";
import { notFound } from "next/navigation";
import { getRole, getRoleGrants, listPermissions, listActiveRoles, roleUserCounts } from "@/lib/system/registry";
import { db } from "@/lib/db";
import { groupPermissionsByModule } from "@/lib/system/helpers";
import { PermissionEditor } from "./PermissionEditor";

export const dynamic = "force-dynamic";

export default async function RolePermissionsPage({ params }: { params: Promise<{ roleKey: string }> }) {
  const { roleKey } = await params;
  const role = await getRole(roleKey);
  if (!role) notFound();

  const summaryCount = (await roleUserCounts())[roleKey] ?? 0;

  if (roleKey === "super_admin") {
    return (
      <div className="space-y-4">
        <Link href="/admin/system/roles" className="text-sm text-brand-dark hover:underline">← Back to roles</Link>
        <div className="rounded-card border border-line bg-white p-6">
          <h2 className="text-lg font-semibold text-brand-dark">{role.label}</h2>
          <p className="mt-2 text-sm text-ink-soft">Super Admin has unrestricted access and bypasses all permission checks. There is nothing to edit here.</p>
        </div>
      </div>
    );
  }

  const [grants, permissions, modules, roles] = await Promise.all([
    getRoleGrants(roleKey),
    listPermissions(),
    db.systemModule.findMany({ select: { key: true, label: true } }),
    listActiveRoles(),
  ]);

  const moduleLabel = new Map(modules.map((m) => [m.key, m.label]));
  const grouped = groupPermissionsByModule(permissions);
  const groups = Object.keys(grouped)
    .sort((a, b) => (moduleLabel.get(a) ?? a).localeCompare(moduleLabel.get(b) ?? b))
    .map((mk) => ({
      moduleKey: mk,
      moduleLabel: moduleLabel.get(mk) ?? mk,
      perms: grouped[mk].map((p) => ({ key: p.key, label: p.label, description: p.description, moduleKey: p.moduleKey })),
    }));

  return (
    <div className="space-y-6">
      <Link href="/admin/system/roles" className="text-sm text-brand-dark hover:underline">← Back to roles</Link>
      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="text-lg font-semibold text-brand-dark">{role.label}</h2>
        <p className="mt-1 text-sm text-ink-soft">{role.description}</p>
        <p className="mt-2 text-xs text-ink-soft">{summaryCount} user(s) · created {role.createdAt.toLocaleDateString()}</p>
      </div>
      <PermissionEditor
        roleKey={roleKey}
        groups={groups}
        grantedKeys={grants}
        otherRoles={roles.filter((r) => r.key !== roleKey).map((r) => ({ key: r.key, label: r.label }))}
      />
    </div>
  );
}
