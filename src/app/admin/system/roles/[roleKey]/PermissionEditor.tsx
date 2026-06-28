"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setRolePermission, copyRolePermissions } from "../../actions";

type Perm = { key: string; label: string; description: string; moduleKey: string };
type Group = { moduleKey: string; moduleLabel: string; perms: Perm[] };
type Role = { key: string; label: string };

export function PermissionEditor({
  roleKey, groups, grantedKeys, otherRoles,
}: { roleKey: string; groups: Group[]; grantedKeys: string[]; otherRoles: Role[] }) {
  const router = useRouter();
  const [granted, setGranted] = useState<Set<string>>(new Set(grantedKeys));
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySource, setCopySource] = useState<string>("");

  async function flip(permKey: string, next: boolean) {
    setGranted((s) => { const n = new Set(s); if (next) { n.add(permKey); } else { n.delete(permKey); } return n; });
    const res = await setRolePermission(roleKey, permKey, next);
    if (!res.ok) {
      setGranted((s) => { const n = new Set(s); if (next) { n.delete(permKey); } else { n.add(permKey); } return n; });
      if (res.error) alert(res.error);
    }
  }

  async function doCopy() {
    if (!copySource) return;
    const res = await copyRolePermissions(roleKey, copySource);
    if (!res.ok) { if (res.error) alert(res.error); return; }
    alert(`Added ${res.added ?? 0} permission(s).`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => setCopyOpen(true)} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt">
          Copy from role…
        </button>
      </div>

      {groups.map((g) => (
        <details key={g.moduleKey} open className="rounded-card border border-line bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-dark">{g.moduleLabel}</summary>
          <ul className="divide-y divide-line">
            {g.perms.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="text-sm text-ink">{p.label}</div>
                  <div className="font-mono text-xs text-ink-soft">{p.key}</div>
                </div>
                <input type="checkbox" checked={granted.has(p.key)} onChange={(e) => flip(p.key, e.target.checked)} aria-label={`Grant ${p.key}`} className="h-4 w-4" />
              </li>
            ))}
          </ul>
        </details>
      ))}

      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={() => setCopyOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Copy from role" className="relative w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-brand-dark">Copy permissions from another role</h2>
            <p className="mb-3 text-xs text-ink-soft">This adds the source role&apos;s granted permissions that this role doesn&apos;t have yet. It never revokes anything.</p>
            <select value={copySource} onChange={(e) => setCopySource(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm">
              <option value="">— choose a role —</option>
              {otherRoles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCopyOpen(false)} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt">Cancel</button>
              <button type="button" disabled={!copySource} onClick={() => { setCopyOpen(false); doCopy(); }} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
