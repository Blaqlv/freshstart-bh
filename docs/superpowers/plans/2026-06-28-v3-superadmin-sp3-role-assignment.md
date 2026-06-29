# v3 Super Admin — SP3 (Custom Role Assignment & Live Identity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SP2's custom roles assignable to users and effective immediately — a `SystemRole`-sourced role picker (Super-Admin-gated for custom roles, with a permission summary), live per-request identity refresh so role changes/deactivations take effect on the next request, a courtesy email, and inline reassignment when deactivating a populated role.

**Architecture:** A new pure classifier (`classifyRoleAssignment`) + enum inverse (`enumFromRoleKey`) drive a single server-only write path (`applyRoleAssignment`) shared by user-management and role-deactivation. `requireSession()` is refactored to re-resolve identity from the DB each request (cached), making the JWT's `roleKey`/`isSuperAdmin` advisory and closing a deactivated-user access gap. UI is a thin client island for assignment + an extended deactivation modal.

**Tech Stack:** Next.js 16 (App Router, server components/actions), Prisma 6 + Neon, jose JWT, React `cache()`, Tailwind, `tsx` for pure unit tests (no Jest/Vitest), Resend (`sendEmail`).

---

## Repo conventions (read before starting)

- **DB:** `import { db } from "@/lib/db"`. **Audit:** `audit(actor, action, entity, entityId?, metadata?)` where `actor = { sub, email } | null`, from `@/lib/audit`.
- **Auth:** `requireCapability(cap)` and `requireSuperAdmin()` both build on `requireSession()` and return a `Session` (`{ sub, email, name, role, roleKey, isSuperAdmin }`). `requireSuperAdmin()` calls `redirect()` — call outside try/catch.
- **Roles:** `roleKeyFromEnum(role)`, `effectiveRoleKey(user)`, `ROLE_KEYS` from `@/lib/roles`. **Built-in guard:** `isBuiltInRoleKey(key)` from `@/lib/system/helpers`.
- **Permissions engine:** `getEffectivePermissions(roleKey)` (cached) from `@/lib/permissions` returns a `Set<string>` of granted permission **keys**.
- **Email:** `sendEmail({ to, subject, text, html? })` → `Promise<boolean>` from `@/lib/notify` (returns `false` when unconfigured; never throws on config, but wrap calls defensively).
- **Tests are pure `tsx`** importing `.ts` via relative paths; tsx resolves `@/...` aliases (SP1/SP2 prove it). Keep tested modules free of `server-only`/`db`. Run with `npx tsx tests/<name>.mjs`.
- **Lint/type/build:** `npm run lint`, `npx tsc --noEmit -p tsconfig.json`, `npm run build`.
- **Prisma `User` fields** (confirmed): `id, email, name, role (Role enum), customRoleKey (String?), active (Boolean), isSuperAdmin (Boolean), mfaEnabled`. **`SystemRole`**: `key, label, description, isSystem, isActive`.

## File map

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/lib/roles.ts` | Modify | Add pure `enumFromRoleKey` + `classifyRoleAssignment` |
| `tests/role-assignment.mjs` | Create | Pure-helper unit tests |
| `src/lib/auth.ts` | Modify | `requireSession` re-resolves identity from DB via cached `getCurrentUser`; inactive/missing → unauthenticated |
| `src/lib/system/assign.ts` | Create | Shared server-only `applyRoleAssignment` write path |
| `src/lib/system/registry.ts` | Modify | Add `assignableRoles()` (active, exclude `super_admin`, with permission summaries) |
| `src/app/admin/users/actions.ts` | Modify | `setUserRole` delegates to `applyRoleAssignment`; audit `from`/`to`; email names acting admin |
| `src/app/admin/users/RoleAssign.tsx` | Create | Client island: role `<select>` + permission summary; custom options Super-Admin-only |
| `src/app/admin/users/page.tsx` | Modify | Source role control from `assignableRoles()`; render `RoleAssign` |
| `src/app/admin/system/actions.ts` | Modify | `deactivateRole(roleKey, reassignToKey?)` reassigns users before deactivating |
| `src/app/admin/system/roles/RoleManager.tsx` | Modify | Deactivation modal gains "reassign N users to" select when count > 0 |

---

## Task 1: Pure role-assignment helpers + tests (TDD)

**Files:**
- Modify: `src/lib/roles.ts`
- Test: `tests/role-assignment.mjs`

- [ ] **Step 1: Write the failing test `tests/role-assignment.mjs`**

```js
// tests/role-assignment.mjs
import assert from "node:assert";
import { roleKeyFromEnum, enumFromRoleKey, classifyRoleAssignment } from "../src/lib/roles.ts";

// enumFromRoleKey round-trips with roleKeyFromEnum for all 6 enum roles
const enums = ["ADMINISTRATOR", "CLINICAL_DIRECTOR", "COMPLIANCE_OFFICER", "RECEPTIONIST", "PROVIDER", "BILLING_STAFF"];
for (const e of enums) {
  assert.strictEqual(enumFromRoleKey(roleKeyFromEnum(e)), e, `round-trip ${e}`);
}
assert.strictEqual(enumFromRoleKey("super_admin"), null);
assert.strictEqual(enumFromRoleKey("intake_coordinator"), null);

// classifyRoleAssignment
assert.deepStrictEqual(
  classifyRoleAssignment("administrator", { viewerIsSuperAdmin: false }),
  { kind: "builtin", role: "ADMINISTRATOR" },
);
assert.deepStrictEqual(classifyRoleAssignment("super_admin", { viewerIsSuperAdmin: true }), { kind: "reject" });
assert.deepStrictEqual(classifyRoleAssignment("intake_coordinator", { viewerIsSuperAdmin: true }), { kind: "custom" });
assert.deepStrictEqual(classifyRoleAssignment("intake_coordinator", { viewerIsSuperAdmin: false }), { kind: "reject" });
assert.deepStrictEqual(classifyRoleAssignment("", { viewerIsSuperAdmin: true }), { kind: "custom" }); // empty -> custom; DB rejects

console.log("role-assignment test PASSED");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx tests/role-assignment.mjs`
Expected: FAIL — `enumFromRoleKey` / `classifyRoleAssignment` are not exported from `roles.ts`.

- [ ] **Step 3: Add the helpers to `src/lib/roles.ts`**

Append to the end of `src/lib/roles.ts` (the `Role` type is already imported at the top):

```ts
/** Inverse of roleKeyFromEnum: a SystemRole.key → the static Role enum, or
 *  null for super_admin / custom / unknown keys. */
export function enumFromRoleKey(key: string): Role | null {
  const map: Record<string, Role> = {
    administrator: "ADMINISTRATOR",
    clinical_director: "CLINICAL_DIRECTOR",
    compliance_officer: "COMPLIANCE_OFFICER",
    receptionist: "RECEPTIONIST",
    provider: "PROVIDER",
    billing_staff: "BILLING_STAFF",
  };
  return map[key] ?? null;
}

export type RoleAssignmentPlan =
  | { kind: "builtin"; role: Role }
  | { kind: "custom" }
  | { kind: "reject" };

/** Decide how a submitted role key should be applied to a user. Pure — a
 *  "custom" result still needs DB validation that the role exists & is active. */
export function classifyRoleAssignment(
  key: string,
  opts: { viewerIsSuperAdmin: boolean },
): RoleAssignmentPlan {
  if (key === "super_admin") return { kind: "reject" }; // DB-only via the SP1 script
  const role = enumFromRoleKey(key);
  if (role) return { kind: "builtin", role };
  return opts.viewerIsSuperAdmin ? { kind: "custom" } : { kind: "reject" };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx tests/role-assignment.mjs`
Expected: `role-assignment test PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roles.ts tests/role-assignment.mjs
git commit -m "feat(sp3): pure role-assignment classifier + enum inverse (TDD)"
```

---

## Task 2: Live identity refresh in `requireSession`

**Files:**
- Modify: `src/lib/auth.ts`

No pure unit test (DB-bound); verified via `tsc` + the SP1/SP2 suites + build.

- [ ] **Step 1: Add imports to `src/lib/auth.ts`**

The file currently imports from `next/headers`, `jose`, `@prisma/client`, `@/lib/rbac`, `next/navigation`, `@/lib/permissions`, `@/lib/capability-map`. Add these three:

```ts
import { cache } from "react";
import { db } from "@/lib/db";
import { effectiveRoleKey } from "@/lib/roles";
```

- [ ] **Step 2: Add the cached fresh-user reader**

Add directly above the existing `requireSession` function:

```ts
/** Fresh identity for the logged-in user, memoized once per request. */
const getCurrentUser = cache(async (sub: string) => {
  return db.user.findUnique({
    where: { id: sub },
    select: {
      id: true, email: true, name: true,
      role: true, customRoleKey: true, active: true, isSuperAdmin: true,
    },
  });
});
```

- [ ] **Step 3: Replace `requireSession` to re-resolve from the DB**

Replace the existing `requireSession` body:

```ts
/** Throws if not authenticated OR the user is missing/deactivated.
 *  Re-resolves role/super-admin/active from the DB each request — the JWT's
 *  baked claims are advisory. Use in server components / actions. */
export async function requireSession(): Promise<Session> {
  const cookieSession = await getSession();
  if (!cookieSession) throw new Error("UNAUTHENTICATED");
  const user = await getCurrentUser(cookieSession.sub);
  if (!user || !user.active) throw new Error("UNAUTHENTICATED");
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleKey: effectiveRoleKey(user),
    isSuperAdmin: user.isSuperAdmin,
  };
}
```

`requireCapability` and `requireSuperAdmin` already call `requireSession`, so they inherit fresh identity automatically. `getSession` (pure cookie decode) is unchanged.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Re-run SP1/SP2 suites (guard against drift)**

Run: `npx tsx tests/roles.mjs && npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs && npx tsx tests/system-helpers.mjs && npx tsx tests/role-assignment.mjs`
Expected: all PASSED.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(sp3): live identity refresh in requireSession (closes deactivated-user gap)"
```

---

## Task 3: Shared assignment write path

**Files:**
- Create: `src/lib/system/assign.ts`

- [ ] **Step 1: Create `src/lib/system/assign.ts`**

```ts
import "server-only";
import { db } from "@/lib/db";
import { classifyRoleAssignment } from "@/lib/roles";

export type AssignResult = { ok: boolean; error?: string };

/** The single write path for assigning a role (built-in or custom) to a user.
 *  Enforces the custom-role Super-Admin gate and validates custom keys against
 *  SystemRole. Used by user management and role-deactivation reassignment. */
export async function applyRoleAssignment(input: {
  userId: string;
  key: string;
  actorIsSuperAdmin: boolean;
}): Promise<AssignResult> {
  const plan = classifyRoleAssignment(input.key, { viewerIsSuperAdmin: input.actorIsSuperAdmin });
  if (plan.kind === "reject") return { ok: false, error: "That role cannot be assigned." };

  if (plan.kind === "builtin") {
    await db.user.update({
      where: { id: input.userId },
      data: { role: plan.role, customRoleKey: null },
    });
    return { ok: true };
  }

  // custom: the role must exist, be active, and not be a built-in/system role.
  const role = await db.systemRole.findUnique({
    where: { key: input.key },
    select: { isActive: true, isSystem: true },
  });
  if (!role || !role.isActive || role.isSystem) return { ok: false, error: "Custom role is unavailable." };
  await db.user.update({
    where: { id: input.userId },
    data: { customRoleKey: input.key }, // keep the existing role enum as a fallback
  });
  return { ok: true };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/system/assign.ts
git commit -m "feat(sp3): shared applyRoleAssignment write path (built-in + gated custom)"
```

---

## Task 4: Registry `assignableRoles()` with permission summaries (§6.1)

**Files:**
- Modify: `src/lib/system/registry.ts`

- [ ] **Step 1: Add imports to `src/lib/system/registry.ts`**

The file already imports `db` and `effectiveRoleKey`. Add:

```ts
import { getEffectivePermissions } from "@/lib/permissions";
import { isBuiltInRoleKey } from "@/lib/system/helpers";
```

- [ ] **Step 2: Append `assignableRoles()`**

```ts
export type AssignableRole = {
  key: string;
  label: string;
  isBuiltin: boolean;
  permissionLabels: string[];
};

/** Active roles a user can be assigned (excludes super_admin), each with a
 *  human-readable summary of the permissions it grants (Prompt 3 §6.1). */
export async function assignableRoles(): Promise<AssignableRole[]> {
  const roles = await db.systemRole.findMany({
    where: { isActive: true, key: { not: "super_admin" } },
    orderBy: { label: "asc" },
  });
  const perms = await db.permission.findMany({ select: { key: true, label: true } });
  const labelByKey = new Map(perms.map((p) => [p.key, p.label]));

  const out: AssignableRole[] = [];
  for (const r of roles) {
    const granted = await getEffectivePermissions(r.key);
    const permissionLabels = [...granted].map((k) => labelByKey.get(k) ?? k).sort();
    out.push({ key: r.key, label: r.label, isBuiltin: isBuiltInRoleKey(r.key), permissionLabels });
  }
  return out;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/system/registry.ts
git commit -m "feat(sp3): registry assignableRoles() with per-role permission summaries"
```

---

## Task 5: User-management assignment — action + island + page (§6.1, §6.2)

**Files:**
- Modify: `src/app/admin/users/actions.ts`
- Create: `src/app/admin/users/RoleAssign.tsx`
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Replace `setUserRole` in `src/app/admin/users/actions.ts`**

Add these imports at the top of the file (it already imports `bcrypt`, `revalidatePath`, `Role`, `db`, `requireCapability`, `audit`):

```ts
import { effectiveRoleKey } from "@/lib/roles";
import { applyRoleAssignment } from "@/lib/system/assign";
import { sendEmail } from "@/lib/notify";
```

Replace the entire existing `setUserRole` function with:

```ts
export async function setUserRole(formData: FormData) {
  const session = await requireCapability("users:manage");
  const id = String(formData.get("id"));
  const key = String(formData.get("role") ?? "");
  if (!id || id === session.sub) return; // can't change your own role

  const user = await db.user.findUnique({
    where: { id },
    select: { role: true, customRoleKey: true, email: true, name: true },
  });
  if (!user) return;
  const from = effectiveRoleKey(user);
  if (key === from) return; // no change

  const res = await applyRoleAssignment({ userId: id, key, actorIsSuperAdmin: session.isSuperAdmin });
  if (!res.ok) return; // gate/validation failure — no-op (UI only offers valid options)

  await audit({ sub: session.sub, email: session.email }, "user.role", "User", id, { from, to: key });

  // Best-effort courtesy email — never block the role change on email (§6.2).
  const role = await db.systemRole.findUnique({ where: { key }, select: { label: true } });
  try {
    await sendEmail({
      to: user.email,
      subject: "Your access role has changed",
      text:
        `Hello ${user.name},\n\n` +
        `Your access role has been updated to "${role?.label ?? key}" by ${session.name}.\n` +
        `If you have questions, contact your administrator.`,
    });
  } catch {
    // ignore — email is a courtesy, not a gate
  }

  revalidatePath("/admin/users");
}
```

The hardcoded `ROLES` array is still used by `createUser` (built-in-only creation) — leave it in place.

- [ ] **Step 2: Create the client island `src/app/admin/users/RoleAssign.tsx`**

```tsx
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
```

- [ ] **Step 3: Wire the island into `src/app/admin/users/page.tsx`**

Add imports near the top (it already imports `db`, `requireCapability`, `roleLabels`, `Role`, the actions):

```ts
import { effectiveRoleKey } from "@/lib/roles";
import { assignableRoles } from "@/lib/system/registry";
import { RoleAssign } from "./RoleAssign";
```

In the component body, after `const users = await db.user.findMany(...)`, add:

```ts
  const roles = await assignableRoles();
```

Replace the entire role `<td>` (the `<form action={setUserRole}>…</form>` cell) with:

```tsx
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
```

The `setUserRole` import in `page.tsx` is now unused (the island imports it). Remove `setUserRole` from the `import { createUser, setUserActive, setUserRole } from "./actions";` line → `import { createUser, setUserActive } from "./actions";`.

- [ ] **Step 4: Type-check + lint the touched files**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors; no `admin/users` or `RoleAssign` file appears in lint output.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/users/actions.ts src/app/admin/users/RoleAssign.tsx src/app/admin/users/page.tsx
git commit -m "feat(sp3): assign roles from SystemRole — gated custom + permission summary + email"
```

---

## Task 6: Reassign users when deactivating a role (§5.3)

**Files:**
- Modify: `src/app/admin/system/actions.ts`
- Modify: `src/app/admin/system/roles/RoleManager.tsx`

- [ ] **Step 1: Add the import to `src/app/admin/system/actions.ts`**

It already imports `db`, `requireSuperAdmin`, `audit`, `effectiveRoleKey`, and helpers. Add:

```ts
import { applyRoleAssignment } from "@/lib/system/assign";
```

- [ ] **Step 2: Replace `deactivateRole` in `src/app/admin/system/actions.ts`**

```ts
export async function deactivateRole(roleKey: string, reassignToKey?: string): Promise<Result> {
  const s = await requireSuperAdmin();
  if (isBuiltInRoleKey(roleKey)) return { ok: false, error: "Built-in roles cannot be deactivated." };
  const role = await db.systemRole.findUnique({ where: { key: roleKey } });
  if (!role) return { ok: false, error: "Role not found." };

  // Only custom roles reach here, so holders carry this key via customRoleKey.
  const affected = await db.user.findMany({
    where: { customRoleKey: roleKey },
    select: { id: true, role: true, customRoleKey: true },
  });

  if (affected.length > 0) {
    if (!reassignToKey) {
      return { ok: false, error: `${affected.length} user(s) hold this role — choose a role to reassign them to.` };
    }
    if (reassignToKey === roleKey || reassignToKey === "super_admin") {
      return { ok: false, error: "Choose a different active role to reassign to." };
    }
    const target = await db.systemRole.findUnique({ where: { key: reassignToKey }, select: { isActive: true } });
    if (!target?.isActive) return { ok: false, error: "Reassignment target is unavailable." };

    for (const u of affected) {
      const from = effectiveRoleKey(u);
      const res = await applyRoleAssignment({ userId: u.id, key: reassignToKey, actorIsSuperAdmin: true });
      if (!res.ok) return { ok: false, error: res.error ?? "Reassignment failed." };
      await audit({ sub: s.sub, email: s.email }, "user.role", "User", u.id, { from, to: reassignToKey, reason: "role-deactivation" });
    }
  }

  await db.systemRole.update({ where: { key: roleKey }, data: { isActive: false } });
  await audit({ sub: s.sub, email: s.email }, "system.role.deactivate", "SystemRole", roleKey, {
    prev: "active", next: "inactive",
    reassignedTo: affected.length ? reassignToKey : null,
    reassignedCount: affected.length,
  });
  revalidateSystem();
  revalidatePath("/admin/users");
  return { ok: true };
}
```

- [ ] **Step 3: Update the deactivation UI in `src/app/admin/system/roles/RoleManager.tsx`**

Remove the now-unused `ConfirmDialog` import line:

```ts
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
```

Add `reassignTo` state next to the existing `confirmOff` state:

```ts
  const [reassignTo, setReassignTo] = useState("");
```

Replace the `onDeactivate` function:

```ts
  async function onDeactivate(r: Role, reassignToKey?: string) {
    setError(null);
    const res = await deactivateRole(r.key, reassignToKey);
    if (!res.ok) { setError(res.error ?? "Failed."); return; }
    setConfirmOff(null);
    setReassignTo("");
    router.refresh();
  }
```

Replace the entire `<ConfirmDialog ... />` block at the bottom of the returned JSX with:

```tsx
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
```

(`Modal` and `input` are already defined in this file.)

- [ ] **Step 4: Type-check + lint the touched files**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors; no `admin/system` file appears in lint output (in particular, no "unused `ConfirmDialog`" warning).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/system/actions.ts src/app/admin/system/roles/RoleManager.tsx
git commit -m "feat(sp3): reassign role holders inline when deactivating a populated role"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full pure-test suite**

Run: `npx tsx tests/role-assignment.mjs && npx tsx tests/roles.mjs && npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs && npx tsx tests/system-helpers.mjs`
Expected: every line prints `… PASSED`.

- [ ] **Step 2: Lint + type-check the whole project**

Run: `npm run lint && npx tsc --noEmit -p tsconfig.json`
Expected: no new errors introduced by SP3 (pre-existing errors in untouched files — e.g. `CrisisBanner.tsx`, `consent.ts` — are out of scope; confirm no `roles.ts`, `auth.ts`, `assign.ts`, `registry.ts`, `admin/users/*`, `admin/system/*` file appears).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; `/admin/users` and `/admin/system/roles` still compile.

- [ ] **Step 4: End-to-end manual smoke (Super Admin)**

As a Super Admin on `/admin/users`: assign a **custom** role to a user; confirm the per-row "Access (N)" summary lists that role's permissions; confirm a `user.role` audit row and a role-change email (or `[email:unconfigured]` log line) appear. Confirm the change takes effect on the target's **next request** (their resolved capabilities reflect the new role without re-login). As a **non-Super-Admin** user-manager: confirm only built-in roles appear in the dropdown. In `/admin/system/roles`: create a custom role, assign a user to it, then deactivate it — confirm the modal forces a reassignment target, the user is reassigned (audited), and the role goes inactive. Deactivate a user in `/admin/users` and confirm they lose admin access on their next request.

- [ ] **Step 5: Final commit (if any verification fixups)**

```bash
git add -A
git commit -m "chore(sp3): final verification fixups"
```

---

## Done-when (SP3 acceptance)

- [ ] A Super Admin can assign a custom role to a user from `/admin/users`; it takes effect on the user's next request (no re-login).
- [ ] The assignment UI shows a read-only summary of the selected role's permissions before submit (§6.1).
- [ ] A non-Super-Admin user-manager sees only built-in roles; submitting a custom key is rejected server-side.
- [ ] Deactivating a user revokes their live access on their next request (latent gap closed).
- [ ] Deactivating a populated role offers an inline reassign-to-role step; on confirm users are reassigned (each audited) and the role is deactivated (§5.3).
- [ ] Each role change writes a `user.role` audit row with `from`/`to` and sends a best-effort email naming the acting admin (§6.2).
- [ ] `tests/role-assignment.mjs` passes; SP1/SP2 suites still green; lint + type-check clean; build succeeds.

## Known limitations (deferred to SP4)

- The admin **nav** (`admin/layout.tsx`) still uses `getSession()` (cookie) + enum-based `can(session.role, …)`, so a custom-role user's nav reflects their fallback enum, not their custom permissions, until re-login. Guards (`requireCapability`) already use fresh identity. Converting the nav to permission/module-aware is SP4, along with wiring `requireModule` into the remaining routes and adopting granular `hasPermission('module.action')` keys.
