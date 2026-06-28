import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { roleLabels } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { createUser, setUserActive } from "./actions";
import { effectiveRoleKey } from "@/lib/roles";
import { assignableRoles } from "@/lib/system/registry";
import { RoleAssign } from "./RoleAssign";

export const dynamic = "force-dynamic";

const ROLES: Role[] = [
  "ADMINISTRATOR",
  "CLINICAL_DIRECTOR",
  "COMPLIANCE_OFFICER",
  "RECEPTIONIST",
  "PROVIDER",
  "BILLING_STAFF",
];
const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

export default async function UsersAdmin() {
  const session = await requireCapability("users:manage");
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  const roles = await assignableRoles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">User management</h1>
        <p className="text-sm text-ink-soft">Create staff accounts, assign roles, and deactivate access.</p>
      </div>

      <form action={createUser} className="grid gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block"><span className="text-xs font-medium text-ink-soft">Name</span>
          <input name="name" required className={input} /></label>
        <label className="block"><span className="text-xs font-medium text-ink-soft">Email</span>
          <input name="email" type="email" required className={input} /></label>
        <label className="block"><span className="text-xs font-medium text-ink-soft">Role</span>
          <select name="role" className={input} defaultValue="RECEPTIONIST">
            {ROLES.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-ink-soft">Temp password (min 8)</span>
          <input name="password" type="text" minLength={8} required className={input} /></label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Create user</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">MFA</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{u.name}{u.id === session.sub ? " (you)" : ""}</div>
                  <div className="text-xs text-ink-soft">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const key = effectiveRoleKey(u);
                    const label = roles.find((r) => r.key === key)?.label ?? roleLabels[u.role];
                    return (
                      <RoleAssign
                        userId={u.id}
                        currentKey={key}
                        currentLabel={label}
                        roles={roles}
                        viewerIsSuperAdmin={session.isSuperAdmin}
                        disabled={u.id === session.sub}
                      />
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  {u.mfaEnabled
                    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">on</span>
                    : <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">off</span>}
                </td>
                <td className="px-4 py-3">
                  {u.active
                    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">active</span>
                    : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">inactive</span>}
                </td>
                <td className="px-4 py-3">
                  {u.id !== session.sub && (
                    <form action={setUserActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={(!u.active).toString()} />
                      <button className="text-xs font-medium text-accent hover:underline">
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
