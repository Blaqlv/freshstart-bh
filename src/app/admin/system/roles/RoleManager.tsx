"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isBuiltInRoleKey } from "@/lib/system/helpers";
import { createRole, updateRole, deactivateRole, restoreRole } from "../actions";

type Role = { key: string; label: string; description: string; isActive: boolean };
const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

export function RoleManager({ roles, counts }: { roles: Role[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [confirmOff, setConfirmOff] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const active = roles.filter((r) => r.isActive);
  const inactive = roles.filter((r) => !r.isActive);

  async function onCreate(form: FormData) {
    setError(null);
    const res = await createRole({
      label: String(form.get("label") ?? ""),
      description: String(form.get("description") ?? ""),
      baseRoleKey: String(form.get("baseRoleKey") ?? "") || undefined,
    });
    if (!res.ok) { setError(res.error ?? "Failed."); return; }
    setCreating(false);
    if (res.roleKey) router.push(`/admin/system/roles/${res.roleKey}`);
  }

  async function onEdit(form: FormData) {
    if (!editing) return;
    setError(null);
    const res = await updateRole(editing.key, { label: String(form.get("label") ?? ""), description: String(form.get("description") ?? "") });
    if (!res.ok) { setError(res.error ?? "Failed."); return; }
    setEditing(null);
    router.refresh();
  }

  async function onDeactivate(r: Role, reassignToKey?: string) {
    setError(null);
    const res = await deactivateRole(r.key, reassignToKey);
    if (!res.ok) { setError(res.error ?? "Failed."); return; }
    setConfirmOff(null);
    setReassignTo("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => { setError(null); setCreating(true); }} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
          New role
        </button>
      </div>

      <RoleTable roles={active} counts={counts} onEdit={(r) => { setError(null); setEditing(r); }} onDeactivate={(r) => { setError(null); setConfirmOff(r); }} />

      {inactive.length > 0 && (
        <details className="rounded-card border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">Inactive roles ({inactive.length})</summary>
          <div className="mt-3 space-y-2">
            {inactive.map((r) => (
              <div key={r.key} className="flex items-center justify-between text-sm">
                <span className="text-ink">{r.label} <span className="text-ink-soft">· {r.key}</span></span>
                <button type="button" onClick={async () => { await restoreRole(r.key); router.refresh(); }} className="font-medium text-brand-dark hover:underline">Restore</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Create modal */}
      {creating && (
        <Modal title="New role" onClose={() => setCreating(false)}>
          <form action={onCreate} className="space-y-3">
            <label className="block"><span className="text-xs font-medium text-ink-soft">Label</span><input name="label" required className={input} /></label>
            <label className="block"><span className="text-xs font-medium text-ink-soft">Description</span><input name="description" className={input} /></label>
            <label className="block"><span className="text-xs font-medium text-ink-soft">Base on existing role (optional)</span>
              <select name="baseRoleKey" defaultValue="" className={input}>
                <option value="">— none —</option>
                {active.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end"><button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Create</button></div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title={`Edit ${editing.label}`} onClose={() => setEditing(null)}>
          <form action={onEdit} className="space-y-3">
            <label className="block"><span className="text-xs font-medium text-ink-soft">Label</span><input name="label" defaultValue={editing.label} required className={input} /></label>
            <label className="block"><span className="text-xs font-medium text-ink-soft">Description</span><input name="description" defaultValue={editing.description} className={input} /></label>
            <p className="text-xs text-ink-soft">Key <code>{editing.key}</code> is immutable.</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end"><button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Save</button></div>
          </form>
        </Modal>
      )}

      {confirmOff && (() => {
        const count = counts[confirmOff.key] ?? 0;
        const targets = active.filter((r) => r.key !== confirmOff.key && r.key !== "super_admin");
        return (
          <Modal title={`Deactivate ${confirmOff.label}?`} onClose={() => { setConfirmOff(null); setReassignTo(""); setError(null); }}>
            <div className="space-y-3">
              {count > 0 ? (
                <>
                  <p className="text-sm text-ink-soft">{count} user(s) hold this role. Choose a role to reassign them to before deactivating.</p>
                  <label className="block"><span className="text-xs font-medium text-ink-soft">Reassign users to</span>
                    <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={input}>
                      <option value="">— select a role —</option>
                      {targets.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <p className="text-sm text-ink-soft">No users hold this role. Deactivating hides it from assignment; it can be restored later.</p>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setConfirmOff(null); setReassignTo(""); setError(null); }} className="rounded-full border border-line px-4 py-2 text-sm">Cancel</button>
                <button
                  type="button"
                  disabled={count > 0 && !reassignTo}
                  onClick={() => onDeactivate(confirmOff, reassignTo || undefined)}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function RoleTable({ roles, counts, onEdit, onDeactivate }: { roles: Role[]; counts: Record<string, number>; onEdit: (r: Role) => void; onDeactivate: (r: Role) => void }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-left text-ink-soft">
          <tr>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Key</th>
            <th className="px-4 py-3 font-medium">Users</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {roles.map((r) => {
            const builtIn = isBuiltInRoleKey(r.key);
            return (
              <tr key={r.key}>
                <td className="px-4 py-3"><div className="font-medium text-ink">{r.label}</div><div className="text-xs text-ink-soft">{r.description}</div></td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{r.key}</td>
                <td className="px-4 py-3">{counts[r.key] ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link href={`/admin/system/roles/${r.key}`} className="text-xs font-medium text-brand-dark hover:underline">Permissions</Link>
                    <button type="button" onClick={() => onEdit(r)} className="text-xs font-medium text-brand-dark hover:underline">Edit</button>
                    {r.key === "super_admin" ? null : builtIn ? (
                      <span title="Built-in role — cannot be deactivated" className="text-xs text-ink-soft">Protected</span>
                    ) : (
                      <button type="button" onClick={() => onDeactivate(r)} className="text-xs font-medium text-accent hover:underline">Deactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-brand-dark">{title}</h2>
        {children}
      </div>
    </div>
  );
}
