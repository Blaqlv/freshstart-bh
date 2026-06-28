"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { SlideOver } from "@/components/admin/SlideOver";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { GROUP_ORDER, GROUP_LABELS } from "@/lib/system/helpers";
import { toggleModule, setModuleRoleAccess } from "./actions";

type Module = {
  key: string; label: string; description: string; group: string;
  isEnabled: boolean; canDisable: boolean; updatedAt: string | Date; updatedByName: string | null;
};
type Role = { key: string; label: string };
type Access = { moduleKey: string; roleKey: string; canAccess: boolean };

export function ModulesPanel({ modules, roles, access }: { modules: Module[]; roles: Role[]; access: Access[] }) {
  const [confirm, setConfirm] = useState<Module | null>(null);
  const [slideModule, setSlideModule] = useState<Module | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function doToggle(m: Module, enabled: boolean) {
    setPending(m.key);
    const res = await toggleModule(m.key, enabled);
    setPending(null);
    if (!res.ok && res.error) alert(res.error);
  }

  const byGroup = GROUP_ORDER.map((g) => ({ group: g, items: modules.filter((m) => m.group === g) }));

  return (
    <div className="space-y-8">
      {byGroup.map(({ group, items }) =>
        items.length === 0 ? null : (
          <section key={group}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">{GROUP_LABELS[group]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <div key={m.key} className="rounded-card border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-ink">{m.label}</div>
                      <div className="mt-1 text-xs text-ink-soft">{m.description}</div>
                    </div>
                    {m.canDisable ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={m.isEnabled}
                        disabled={pending === m.key}
                        onClick={() => (m.isEnabled ? setConfirm(m) : doToggle(m, true))}
                        className={`h-6 w-11 shrink-0 rounded-full transition ${m.isEnabled ? "bg-green-500" : "bg-zinc-300"}`}
                        aria-label={`${m.isEnabled ? "Disable" : "Enable"} ${m.label}`}
                      >
                        <span className={`block h-5 w-5 rounded-full bg-white transition ${m.isEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    ) : (
                      <span title="Required — cannot be disabled" className="shrink-0 text-ink-soft">
                        <Lock className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
                    <span>{m.updatedByName ? `Updated by ${m.updatedByName}` : "Not yet changed"}</span>
                    <button type="button" onClick={() => setSlideModule(m)} className="font-medium text-brand-dark hover:underline">
                      Manage role access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ),
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? `Disable ${confirm.label}?` : ""}
        message="This immediately removes access for all users. You can re-enable it at any time."
        confirmLabel="Disable"
        danger
        onConfirm={() => confirm && doToggle(confirm, false)}
        onClose={() => setConfirm(null)}
      />

      <SlideOver open={slideModule !== null} onClose={() => setSlideModule(null)} title={slideModule ? `Role access — ${slideModule.label}` : ""}>
        {slideModule && (
          <RoleAccessTable
            moduleKey={slideModule.key}
            roles={roles}
            access={access.filter((a) => a.moduleKey === slideModule.key)}
          />
        )}
      </SlideOver>
    </div>
  );
}

function RoleAccessTable({ moduleKey, roles, access }: { moduleKey: string; roles: Role[]; access: Access[] }) {
  const initial: Record<string, boolean> = {};
  for (const r of roles) initial[r.key] = r.key === "super_admin" ? true : access.find((a) => a.roleKey === r.key)?.canAccess ?? true;
  const [state, setState] = useState(initial);

  async function flip(roleKey: string, next: boolean) {
    setState((s) => ({ ...s, [roleKey]: next }));
    const res = await setModuleRoleAccess(moduleKey, roleKey, next);
    if (!res.ok) {
      setState((s) => ({ ...s, [roleKey]: !next }));
      if (res.error) alert(res.error);
    }
  }

  return (
    <ul className="divide-y divide-line">
      {roles.map((r) => {
        const locked = r.key === "super_admin";
        return (
          <li key={r.key} className="flex items-center justify-between py-3">
            <span className="text-sm text-ink">{r.label}</span>
            <input
              type="checkbox"
              checked={state[r.key]}
              disabled={locked}
              onChange={(e) => flip(r.key, e.target.checked)}
              aria-label={`${r.label} can access this module`}
              className="h-4 w-4"
            />
          </li>
        );
      })}
    </ul>
  );
}
