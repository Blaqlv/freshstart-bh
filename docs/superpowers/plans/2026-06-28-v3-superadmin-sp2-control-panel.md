# v3 Super Admin — SP2 (System Control Panel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/system` Super-Admin control panel — toggle modules, control role↔module access, create/edit/deactivate/restore custom roles, grant/revoke permissions, and review a `system.*`-scoped audit trail with CSV export — all live per request, no Redis, no code deploy.

**Architecture:** Route-per-tab under a `requireSuperAdmin()`-guarded section layout. Server components load via a `lib/system/registry.ts` data layer; mutations are typed-arg server actions in `admin/system/actions.ts` that re-check invariants, write `audit()`, and `revalidatePath`. Thin client islands (`ModulesPanel`, `RoleManager`, `PermissionEditor`, plus a new `ConfirmDialog`) provide interactivity; the existing `SlideOver` handles role-access. All access logic resolves through SP1's live `getEffectivePermissions`/`moduleIsEnabled`.

**Tech Stack:** Next.js 16 (App Router, server components/actions), Prisma 6 + Neon, Tailwind, `lucide-react`, `tsx` for pure unit tests (no Jest/Vitest). Server actions use typed args (callable from client islands) and return `{ ok: boolean; error?: string }` so islands can revert optimistic UI.

---

## Repo conventions (read before starting)

- **DB:** `import { db } from "@/lib/db"`. **Audit:** `audit(actor, action, entity, entityId?, metadata?)` where `actor = { sub, email } | null` (from `@/lib/audit`).
- **Auth:** `requireSuperAdmin()` from `@/lib/auth` returns the `Session` (`{ sub, email, name, role, roleKey, isSuperAdmin }`); it calls `redirect("/admin/unavailable")` for non-supers — **call outside any try/catch**.
- **Roles:** `ROLE_KEYS` (the 7 built-in keys) and `effectiveRoleKey(user)` from `@/lib/roles`.
- **SP1 engine:** `getEffectivePermissions`, `moduleIsEnabled` from `@/lib/permissions` already read the registry live — SP2 just writes to it.
- **Class helper:** `cn(...)` from `@/lib/cn`. **Slide-over:** `@/components/admin/SlideOver` (client, `open/onClose/title/widthClass/children`).
- **Tests are pure `tsx`** importing `.ts` via relative paths; the repo resolves `@/...` aliases in tsx (SP1's `capability-map.mjs` proves it). Keep `helpers.ts` free of `server-only`/`db`. Run with `npx tsx tests/<name>.mjs`.
- **Lint/type/build:** `npm run lint`, `npx tsc --noEmit -p tsconfig.json`, `npm run build`.
- **Prisma model fields** (confirmed): `SystemModule{key,label,description,isEnabled,group,canDisable,updatedAt,updatedBy}`, `ModuleRoleAccess{moduleKey,roleKey,canAccess}` unique `[moduleKey,roleKey]`, `SystemRole{key,label,description,isSystem,isActive,createdAt,createdBy}`, `Permission{key,label,description,moduleKey}`, `RolePermission{roleKey,permissionKey,granted,grantedBy}` unique `[roleKey,permissionKey]`.

## File map

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/lib/system/helpers.ts` | Create | Pure: slugify, built-in guard, group-bys, additive diff, CSV, group labels |
| `src/lib/system/registry.ts` | Create | Read/query data layer over `db` |
| `src/app/admin/system/actions.ts` | Create | All `"use server"` mutations (typed args) |
| `src/components/admin/ConfirmDialog.tsx` | Create | Focus-trapped confirm modal |
| `src/app/admin/system/layout.tsx` | Create | `requireSuperAdmin()` guard + tab bar |
| `src/app/admin/system/page.tsx` | Create | Modules tab (server) |
| `src/app/admin/system/ModulesPanel.tsx` | Create | Client island: cards, confirm, role-access slide-over |
| `src/app/admin/system/roles/page.tsx` | Create | Role Management tab (server) |
| `src/app/admin/system/roles/RoleManager.tsx` | Create | Client island: create/edit/deactivate/restore |
| `src/app/admin/system/roles/[roleKey]/page.tsx` | Create | Permission editor (server) |
| `src/app/admin/system/roles/[roleKey]/PermissionEditor.tsx` | Create | Client island: optimistic toggles + copy-from-role |
| `src/app/admin/system/audit/page.tsx` | Create | System audit tab (server) |
| `src/app/admin/system/audit/export/route.ts` | Create | CSV export GET handler |
| `src/app/admin/layout.tsx` | Modify | Add Super-Admin-only nav item |
| `tests/system-helpers.mjs` | Create | Pure-helper unit tests |

---

## Task 1: Pure helpers + tests (TDD)

**Files:**
- Create: `src/lib/system/helpers.ts`
- Test: `tests/system-helpers.mjs`

- [ ] **Step 1: Write the failing test `tests/system-helpers.mjs`**

```js
// tests/system-helpers.mjs
import assert from "node:assert";
import {
  slugifyRoleKey, isBuiltInRoleKey, groupModulesByGroup,
  groupPermissionsByModule, additivePermissionDiff, auditRowsToCsv, GROUP_ORDER,
} from "../src/lib/system/helpers.ts";

// slugify
assert.strictEqual(slugifyRoleKey("Intake Coordinator"), "intake_coordinator");
assert.strictEqual(slugifyRoleKey("  Front-Desk / Reception!! "), "front_desk_reception");
assert.strictEqual(slugifyRoleKey(slugifyRoleKey("Intake Coordinator")), "intake_coordinator"); // idempotent

// built-in guard
assert.strictEqual(isBuiltInRoleKey("administrator"), true);
assert.strictEqual(isBuiltInRoleKey("super_admin"), true);
assert.strictEqual(isBuiltInRoleKey("intake_coordinator"), false);

// group-bys
const mods = [{ key: "a", group: "admin" }, { key: "b", group: "portals" }, { key: "c", group: "admin" }];
const g = groupModulesByGroup(mods);
assert.deepStrictEqual(g.admin.map((m) => m.key), ["a", "c"]);
assert.deepStrictEqual(g.portals.map((m) => m.key), ["b"]);

const perms = [{ key: "x.a", moduleKey: "x" }, { key: "y.a", moduleKey: "y" }, { key: "x.b", moduleKey: "x" }];
const gp = groupPermissionsByModule(perms);
assert.deepStrictEqual(gp.x.map((p) => p.key), ["x.a", "x.b"]);

// additive diff
assert.deepStrictEqual(additivePermissionDiff(["a", "b"], ["b", "c", "d"]), ["c", "d"]);
assert.deepStrictEqual(additivePermissionDiff(["a", "b", "c"], ["a", "b"]), []);

// csv escaping + header
const csv = auditRowsToCsv([
  { createdAt: "2026-06-28T10:00:00.000Z", action: "system.module.disable", target: "patient_portal", actorEmail: "sa@x.com", prev: "true", next: "false" },
  { createdAt: "2026-06-28T10:01:00.000Z", action: "system.role.create", target: 'Role, "X"', actorEmail: null, prev: "", next: "created" },
]);
const lines = csv.split("\n");
assert.strictEqual(lines[0], "Timestamp,Action,Target,Changed By,Previous,New");
assert.ok(lines[1].includes("system.module.disable"));
assert.ok(lines[2].includes('"Role, ""X"""'), "escapes commas+quotes");
assert.ok(lines[2].includes("system"), "null actor -> system");

// GROUP_ORDER covers the five canonical groups
assert.deepStrictEqual([...GROUP_ORDER], ["public_site", "portals", "admin", "compliance", "integrations"]);

console.log("system-helpers test PASSED");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx tests/system-helpers.mjs`
Expected: FAIL — cannot find `../src/lib/system/helpers.ts`.

- [ ] **Step 3: Create `src/lib/system/helpers.ts`**

```ts
import { ROLE_KEYS } from "@/lib/roles";

export const GROUP_ORDER = ["public_site", "portals", "admin", "compliance", "integrations"] as const;
export const GROUP_LABELS: Record<string, string> = {
  public_site: "Public Site",
  portals: "Portals",
  admin: "Admin",
  compliance: "Compliance",
  integrations: "Integrations",
};

/** Slugify a human label into a machine role key: lowercase, non-alnum -> "_", trimmed. */
export function slugifyRoleKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** The 7 enum-backed roles are protected (cannot be deactivated/renamed-key). */
export function isBuiltInRoleKey(key: string): boolean {
  return (ROLE_KEYS as readonly string[]).includes(key);
}

export function groupModulesByGroup<T extends { group: string }>(modules: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const m of modules) (out[m.group] ??= []).push(m);
  return out;
}

export function groupPermissionsByModule<T extends { moduleKey: string }>(perms: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const p of perms) (out[p.moduleKey] ??= []).push(p);
  return out;
}

/** Permissions in `source` not already in `target`, order-preserved, de-duped. */
export function additivePermissionDiff(targetGrants: string[], sourceGrants: string[]): string[] {
  const have = new Set(targetGrants);
  const out: string[] = [];
  for (const k of sourceGrants) {
    if (!have.has(k) && !out.includes(k)) out.push(k);
  }
  return out;
}

export type AuditCsvRow = {
  createdAt: Date | string;
  action: string;
  target: string;
  actorEmail: string | null;
  prev: string;
  next: string;
};

export function auditRowsToCsv(rows: AuditCsvRow[]): string {
  const header = ["Timestamp", "Action", "Target", "Changed By", "Previous", "New"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    const ts = typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString();
    lines.push([ts, r.action, r.target, r.actorEmail ?? "system", r.prev, r.next].map(esc).join(","));
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npx tsx tests/system-helpers.mjs`
Expected: `system-helpers test PASSED`

- [ ] **Step 5: Commit**

```bash
git add src/lib/system/helpers.ts tests/system-helpers.mjs
git commit -m "feat(sp2): pure system helpers (slugify, group-by, diff, csv) + tests"
```

---

## Task 2: Registry data layer + ConfirmDialog + section layout + nav

**Files:**
- Create: `src/lib/system/registry.ts`, `src/components/admin/ConfirmDialog.tsx`, `src/app/admin/system/layout.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `src/lib/system/registry.ts`**

```ts
import { db } from "@/lib/db";
import { effectiveRoleKey } from "@/lib/roles";

/** All modules with their last-editor display name resolved. */
export async function listModulesWithEditors() {
  const modules = await db.systemModule.findMany({ orderBy: { label: "asc" } });
  const ids = [...new Set(modules.map((m) => m.updatedBy).filter((x): x is string => Boolean(x)))];
  const editors = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(editors.map((e) => [e.id, e.name]));
  return modules.map((m) => ({
    ...m,
    updatedByName: m.updatedBy ? nameById.get(m.updatedBy) ?? null : null,
  }));
}

/** Effective-role-key -> user count, across the (small) staff table. */
export async function roleUserCounts(): Promise<Record<string, number>> {
  const users = await db.user.findMany({ select: { role: true, customRoleKey: true } });
  const counts: Record<string, number> = {};
  for (const u of users) {
    const key = effectiveRoleKey(u);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export async function listRoles() {
  return db.systemRole.findMany({ orderBy: [{ isActive: "desc" }, { label: "asc" }] });
}

export async function listActiveRoles() {
  return db.systemRole.findMany({ where: { isActive: true }, orderBy: { label: "asc" } });
}

export async function getRole(roleKey: string) {
  return db.systemRole.findUnique({ where: { key: roleKey } });
}

export async function getRoleGrants(roleKey: string): Promise<string[]> {
  const rows = await db.rolePermission.findMany({
    where: { roleKey, granted: true },
    select: { permissionKey: true },
  });
  return rows.map((r) => r.permissionKey);
}

export async function listPermissions() {
  return db.permission.findMany({ orderBy: { key: "asc" } });
}

export async function getModuleRoleAccess(moduleKey: string) {
  return db.moduleRoleAccess.findMany({ where: { moduleKey } });
}

export async function listSystemAudit(take = 500) {
  return db.auditLog.findMany({
    where: { action: { startsWith: "system." } },
    orderBy: { createdAt: "desc" },
    take,
  });
}
```

- [ ] **Step 2: Create `src/components/admin/ConfirmDialog.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-dark hover:bg-brand-hover"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/system/layout.tsx`**

```tsx
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";

const tabs = [
  { label: "Modules", href: "/admin/system" },
  { label: "Roles", href: "/admin/system/roles" },
  { label: "Audit", href: "/admin/system/audit" },
];

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin(); // redirects non-supers to /admin/unavailable

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">System control</h1>
        <p className="text-sm text-ink-soft">Super Admin only. Changes apply immediately, no deploy.</p>
      </div>
      <nav className="flex gap-2 border-b border-line" aria-label="System control tabs">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="px-3 py-2 text-sm font-medium text-ink hover:text-brand-dark">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Add the Super-Admin-only nav item in `src/app/admin/layout.tsx`**

Immediately after the line `nav.push({ label: "Security", href: "/admin/security" });` (the last `nav.push`), add:

```ts
  if (session.isSuperAdmin) nav.push({ label: "System control", href: "/admin/system" });
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors in `registry.ts`, `ConfirmDialog.tsx`, `system/layout.tsx`, `admin/layout.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/system/registry.ts src/components/admin/ConfirmDialog.tsx src/app/admin/system/layout.tsx src/app/admin/layout.tsx
git commit -m "feat(sp2): system registry data layer + ConfirmDialog + section layout + nav"
```

---

## Task 3: Server actions (all mutations)

**Files:**
- Create: `src/app/admin/system/actions.ts`

- [ ] **Step 1: Create `src/app/admin/system/actions.ts`**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors in `actions.ts`. (Note: `actions.ts` exports only async functions, as required for a `"use server"` module.)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/system/actions.ts
git commit -m "feat(sp2): system control-panel server actions (modules/roles/permissions)"
```

---

## Task 4: Modules tab (page + ModulesPanel + role-access slide-over)

**Files:**
- Create: `src/app/admin/system/page.tsx`, `src/app/admin/system/ModulesPanel.tsx`

- [ ] **Step 1: Create `src/app/admin/system/ModulesPanel.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/app/admin/system/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no new errors in `page.tsx`/`ModulesPanel.tsx`.

- [ ] **Step 4: Manual verification (against seeded DB)**

Run the app (`npm run dev`), sign in as a Super Admin, visit `/admin/system`. Confirm: grouped cards render; core modules show a lock; toggling a non-core module off prompts a confirm; "Manage role access" opens the slide-over with the `super_admin` row locked-on. (If no Super Admin exists yet, create one: `npx tsx scripts/create-super-admin.ts`.)

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/system/page.tsx src/app/admin/system/ModulesPanel.tsx
git commit -m "feat(sp2): modules tab — grouped cards, live toggle w/ confirm, role-access slide-over"
```

---

## Task 5: Role Management tab (page + RoleManager)

**Files:**
- Create: `src/app/admin/system/roles/page.tsx`, `src/app/admin/system/roles/RoleManager.tsx`

- [ ] **Step 1: Create `src/app/admin/system/roles/RoleManager.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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

  async function onDeactivate(r: Role) {
    const res = await deactivateRole(r.key);
    if (!res.ok && res.error) alert(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => { setError(null); setCreating(true); }} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
          New role
        </button>
      </div>

      <RoleTable roles={active} counts={counts} onEdit={(r) => { setError(null); setEditing(r); }} onDeactivate={(r) => setConfirmOff(r)} />

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

      <ConfirmDialog
        open={confirmOff !== null}
        title={confirmOff ? `Deactivate ${confirmOff.label}?` : ""}
        message="Users assigned this role will lose access. Built-in roles cannot be deactivated."
        confirmLabel="Deactivate"
        danger
        onConfirm={() => confirmOff && onDeactivate(confirmOff)}
        onClose={() => setConfirmOff(null)}
      />
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
```

- [ ] **Step 2: Create `src/app/admin/system/roles/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Visit `/admin/system/roles`. Confirm: built-in roles show "Protected" (no Deactivate); user counts populate; "New role" creates a role (slugified key, optional base) and redirects to its permission editor; Edit changes label/description; a created custom role can be deactivated then restored.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/system/roles/page.tsx src/app/admin/system/roles/RoleManager.tsx
git commit -m "feat(sp2): role management tab — create/edit/deactivate/restore with built-in guard"
```

---

## Task 6: Permission Editor (page + PermissionEditor)

**Files:**
- Create: `src/app/admin/system/roles/[roleKey]/page.tsx`, `src/app/admin/system/roles/[roleKey]/PermissionEditor.tsx`

- [ ] **Step 1: Create `src/app/admin/system/roles/[roleKey]/PermissionEditor.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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
    setGranted((s) => { const n = new Set(s); next ? n.add(permKey) : n.delete(permKey); return n; });
    const res = await setRolePermission(roleKey, permKey, next);
    if (!res.ok) {
      setGranted((s) => { const n = new Set(s); next ? n.delete(permKey) : n.add(permKey); return n; });
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
```

(`ConfirmDialog` import is intentionally retained for parity with other islands but the copy flow uses an inline select dialog; if lint flags the unused import, remove the `ConfirmDialog` import line.)

- [ ] **Step 2: Create `src/app/admin/system/roles/[roleKey]/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no new errors. (If lint flags the unused `ConfirmDialog` import in `PermissionEditor.tsx`, delete that import line and re-run.)

- [ ] **Step 4: Manual verification**

Visit `/admin/system/roles/administrator`. Confirm: summary card shows user count + created date; permissions render grouped/collapsible with correct on/off state; toggling persists (reload keeps state) and appears in the audit tab; "Copy from role…" adds only missing grants and reports the count. Visit `/admin/system/roles/super_admin` → read-only notice, no toggles.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/system/roles/[roleKey]/page.tsx" "src/app/admin/system/roles/[roleKey]/PermissionEditor.tsx"
git commit -m "feat(sp2): role permission editor — per-toggle grants + copy-from-role"
```

---

## Task 7: System Audit tab + CSV export

**Files:**
- Create: `src/app/admin/system/audit/page.tsx`, `src/app/admin/system/audit/export/route.ts`

- [ ] **Step 1: Add a shared audit-row formatter to `src/lib/system/helpers.ts`**

Append to `src/lib/system/helpers.ts`:

```ts
type RawAudit = { createdAt: Date | string; action: string; entityId: string | null; actorEmail: string | null; metadata: unknown };

/** Flatten an AuditLog row into display fields for the system audit table/CSV. */
export function formatAuditRow(r: RawAudit): AuditCsvRow {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  const target = (m.target as string) ?? (m.roleKey as string) ?? (m.moduleKey as string) ?? r.entityId ?? "";
  const fmt = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return {
    createdAt: r.createdAt,
    action: r.action,
    target,
    actorEmail: r.actorEmail,
    prev: fmt(m.prev),
    next: fmt(m.next),
  };
}
```

- [ ] **Step 2: Extend `tests/system-helpers.mjs` to cover `formatAuditRow`**

Add before the final `console.log` line:

```js
import { formatAuditRow } from "../src/lib/system/helpers.ts";
const row = formatAuditRow({ createdAt: "2026-06-28T10:00:00.000Z", action: "system.module.disable", entityId: "patient_portal", actorEmail: "sa@x.com", metadata: { target: "Patient Portal", prev: true, next: false } });
assert.strictEqual(row.target, "Patient Portal");
assert.strictEqual(row.prev, "true");
assert.strictEqual(row.next, "false");
const row2 = formatAuditRow({ createdAt: "2026-06-28T10:00:00.000Z", action: "system.role.create", entityId: "intake_coordinator", actorEmail: null, metadata: { next: "created" } });
assert.strictEqual(row2.target, "intake_coordinator");
assert.strictEqual(row2.actorEmail, null);
```

- [ ] **Step 3: Run the test — expect PASS**

Run: `npx tsx tests/system-helpers.mjs`
Expected: `system-helpers test PASSED`

- [ ] **Step 4: Create `src/app/admin/system/audit/page.tsx`**

```tsx
import { listSystemAudit } from "@/lib/system/registry";
import { formatAuditRow } from "@/lib/system/helpers";

export const dynamic = "force-dynamic";

export default async function SystemAuditPage() {
  const logs = await listSystemAudit(500);
  const rows = logs.map((l) => ({ id: l.id, ...formatAuditRow(l) }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">System configuration changes. Most recent 500 shown.</p>
        <a href="/admin/system/audit/export" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt">Export CSV</a>
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Changed by</th>
              <th className="px-4 py-3 font-medium">Previous</th>
              <th className="px-4 py-3 font-medium">New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-ink-soft">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 font-medium text-ink">{r.action}</td>
                <td className="px-4 py-2 text-ink-soft">{r.target}</td>
                <td className="px-4 py-2 text-ink-soft">{r.actorEmail ?? "system"}</td>
                <td className="px-4 py-2 text-ink-soft">{r.prev}</td>
                <td className="px-4 py-2 text-ink-soft">{r.next}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No system changes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/admin/system/audit/export/route.ts`**

```ts
import { requireSuperAdmin } from "@/lib/auth";
import { listSystemAudit } from "@/lib/system/registry";
import { auditRowsToCsv, formatAuditRow } from "@/lib/system/helpers";

export async function GET() {
  await requireSuperAdmin(); // redirects non-supers
  const logs = await listSystemAudit(5000);
  const csv = auditRowsToCsv(logs.map(formatAuditRow));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="system-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
```

- [ ] **Step 6: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no new errors.

- [ ] **Step 7: Manual verification**

Visit `/admin/system/audit` after making changes in earlier tabs. Confirm each change appears with target + prev/new. Click "Export CSV" → a `system-audit-*.csv` downloads and opens cleanly (commas/quotes escaped).

- [ ] **Step 8: Commit**

```bash
git add src/lib/system/helpers.ts tests/system-helpers.mjs src/app/admin/system/audit/page.tsx src/app/admin/system/audit/export/route.ts
git commit -m "feat(sp2): system audit tab (filtered system.*) + CSV export"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full pure-test suite**

Run: `npx tsx tests/system-helpers.mjs`
Expected: `system-helpers test PASSED`. (Also re-run SP1's suite to guard against drift: `npx tsx tests/roles.mjs && npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs`.)

- [ ] **Step 2: Lint + type-check the whole project**

Run: `npm run lint && npx tsc --noEmit -p tsconfig.json`
Expected: no new errors introduced by SP2 (pre-existing errors in untouched files — e.g. `CrisisBanner.tsx`, `consent.ts` — are out of scope).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds (the new `/admin/system/*` routes compile). If the environment lacks build-time DB/env, at minimum confirm the new routes type-check.

- [ ] **Step 4: End-to-end manual smoke (Super Admin)**

As a Super Admin: toggle a module off/on (confirm gate on disable); change a role's module access in the slide-over; create a custom role from a base, edit its permissions, copy from another role, deactivate then restore it; verify every action shows in the audit tab and the CSV export. As a non-Super-Admin: confirm `/admin/system` redirects to `/admin/unavailable` and the "System control" nav item is absent.

- [ ] **Step 5: Final commit (if any verification fixups)**

```bash
git add -A
git commit -m "chore(sp2): final verification fixups"
```

---

## Done-when (SP2 acceptance)

- [ ] `/admin/system` (+ `roles`, `roles/[roleKey]`, `audit`, `audit/export`) exist; section layout and every action call `requireSuperAdmin()`; non-supers redirect to `/admin/unavailable`.
- [ ] Super-Admin-only "System control" nav item; invisible to others.
- [ ] Modules tab: grouped cards, live enable/disable, `canDisable:false` locked, last-changed shown; disabling gated by a confirm dialog (no undo-toast).
- [ ] Role-access slide-over toggles `ModuleRoleAccess` live; `super_admin` row locked-on.
- [ ] Role management: create (slugify + optional base + seeded module access), edit (label/desc only), deactivate/restore with built-in roles protected; reassignment deferred to SP3.
- [ ] Permission editor: per-toggle live grant/revoke (no debounce); `super_admin` read-only; copy-from-role as additive count confirm.
- [ ] System audit tab filters `system.*` with target/prev/new; CSV export escapes correctly.
- [ ] Every mutation writes an audit row; all changes live per request (no Redis).
- [ ] `tests/system-helpers.mjs` passes; lint + type-check clean.

## Deferred (NOT this plan — SP3)

- Assigning users to custom roles; sourcing the user-management role dropdown from `SystemRole`.
- Role-change email notifications (reuse `sendEmail`) + cache/session implications on role identity change.
- Converting the admin nav from enum-based `can(session.role, …)` to permission/module-aware.
- Wiring `requireModule` into the remaining module routes.
