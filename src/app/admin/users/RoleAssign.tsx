"use client";

import { useState } from "react";
import { setUserRole } from "./actions";

export type AssignableRole = { key: string; label: string; isBuiltin: boolean; permissionLabels: string[] };

export function RoleAssign({
  userId, currentKey, currentLabel, roles, viewerIsSuperAdmin, disabled,
}: {
  userId: string;
  currentKey: string;
  currentLabel: string;
  roles: AssignableRole[];
  viewerIsSuperAdmin: boolean;
  disabled: boolean;
}) {
  // Non-supers may only pick built-in roles. Always include the user's current
  // role so the select reflects reality even if it's a custom role.
  const options = roles.filter((r) => r.isBuiltin || viewerIsSuperAdmin || r.key === currentKey);
  const hasCurrent = options.some((r) => r.key === currentKey);
  const [selected, setSelected] = useState(currentKey);
  const summary = roles.find((r) => r.key === selected)?.permissionLabels ?? [];

  if (disabled) {
    return <span className="text-xs text-ink-soft">{currentLabel}</span>;
  }

  return (
    <form action={setUserRole} className="space-y-1">
      <input type="hidden" name="id" value={userId} />
      <div className="flex items-center gap-2">
        <select
          name="role"
          aria-label="Role"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded border border-line px-2 py-1 text-xs"
        >
          {!hasCurrent && <option value={currentKey}>{currentLabel}</option>}
          {options.map((r) => (
            <option key={r.key} value={r.key}>{r.label}{r.isBuiltin ? "" : " (custom)"}</option>
          ))}
        </select>
        <button className="text-xs font-medium text-brand-dark hover:underline">Set</button>
      </div>
      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer">Access ({summary.length})</summary>
        {summary.length
          ? <ul className="ml-4 mt-1 list-disc">{summary.map((p) => <li key={p}>{p}</li>)}</ul>
          : <p className="mt-1">No permissions.</p>}
      </details>
    </form>
  );
}
