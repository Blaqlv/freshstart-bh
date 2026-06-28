# v3 Super Admin — SP2 (System Control Panel) Design Spec

**Date:** 2026-06-28
**Status:** Approved (brainstorm) — ready for implementation plan
**Predecessor:** SP1 Foundation (PR #18, merged, prod-deployed). SP1 delivered the data model
(5 tables + `User.isSuperAdmin`/`customRoleKey`), seeds (26 modules / 7 roles / 44 permissions),
the DB-backed permission engine (`getEffectivePermissions`, `moduleIsEnabled`, `hasPermission`),
the `requireCapability`/`requireSuperAdmin`/`requireModule` guards, and the `/admin/unavailable`
page. This spec covers **Part 5** of `prompt-3-super-admin-control-panel.md` only.
**Successor:** SP3 (Part 6 — user role assignment, role-change notifications, nav permission-awareness).

---

## Goal

Give the Super Admin a `/admin/system` control panel to manage the live module/role/permission
registry with no code deploy: toggle modules on/off, control which roles can access which modules,
create/rename/deactivate/restore custom roles, grant/revoke individual permissions, and review a
scoped audit trail (with CSV export). All changes are read **live per request** by SP1's engine,
so they take effect on the affected user's next request with no re-login.

## Scope boundary (decided during brainstorm)

- **SP2 = registry management only.** Changes are live immediately for the 6 built-in roles via SP1's
  engine. Creating a **custom** role persists and is fully editable, but **assigning users** to custom
  roles and making the **admin nav permission-aware** is **SP3**.
- **No Redis.** Carry SP1's per-request React `cache()` + `revalidatePath` on every mutation. This is
  strictly better than the prompt-3 doc's "Redis 60s TTL": zero staleness window, no invalidation
  surface to get wrong on serverless. The prompt-3 Redis requirement is intentionally **not** adopted.
- **Confirm dialog, no undo-toast.** A confirm step gates destructive toggles; the spec's ephemeral
  30-second undo-toast is dropped (re-enabling is one click; no toast library exists in the repo).
- **Per-toggle save, no debounce.** Permission toggles are discrete actions, each persisted immediately.
- **Copy-from-role = count/list confirm**, not a visual side-by-side diff.

## Non-goals (deferred to SP3 or later)

- Assigning users to custom roles; role-change email notifications; forced re-auth on role change.
- Converting the admin nav from enum-based `can(session.role, …)` to permission/module-aware.
- Wiring `requireModule` into the remaining module routes (only medicaid + incidents are wired so far).
- A full visual permission diff; an undo-toast system; Redis caching.

---

## Architecture (Approach A — route-per-tab, server components + server actions, thin client islands)

### Routes
| Route | Type | Responsibility |
|---|---|---|
| `src/app/admin/system/layout.tsx` | Server | `requireSuperAdmin()` guard for all reads; renders the sub-tab bar |
| `/admin/system` | Server page | **Modules** tab (default) |
| `/admin/system/roles` | Server page | **Role Management** tab |
| `/admin/system/roles/[roleKey]` | Server page | **Permission Editor** (full page, spec 5.4) |
| `/admin/system/audit` | Server page | **System Audit** tab (filtered `system.*`) |
| `/admin/system/audit/export` | GET route handler | `text/csv` download |

### Gating (defense in depth)
- The section `layout.tsx` calls `requireSuperAdmin()` (redirects non-supers to `/admin/unavailable`).
- **Every server action independently calls `requireSuperAdmin()`** — layouts do not protect actions.
- No capability map is used; this surface is purely `isSuperAdmin`-gated. The `system.*` permissions
  SP1 seeded remain in the catalog but are not checked (super_admin bypasses via flag).
- Server actions **re-check invariants** (`canDisable`, built-in-role guard, `super_admin` immutability)
  rather than trusting disabled UI controls.

### Nav
One new item in `src/app/admin/layout.tsx`, gated on `session.isSuperAdmin`:
`{ label: "System control", href: "/admin/system" }`. Invisible to all non-Super-Admins.

### New / changed files
| File | Create/Modify | Responsibility |
|---|---|---|
| `src/lib/system/registry.ts` | Create | Read/query data layer (modules grouped; roles + user counts; role-with-grants) |
| `src/lib/system/helpers.ts` | Create | **Pure** helpers: slugify, group-by, copy-role diff, built-in-role guard, CSV |
| `src/app/admin/system/layout.tsx` | Create | Section guard + tab bar |
| `src/app/admin/system/page.tsx` | Create | Modules tab (server) |
| `src/app/admin/system/ModulesPanel.tsx` | Create | Client island: cards, confirm, role-access slide-over |
| `src/app/admin/system/roles/page.tsx` | Create | Role Management tab (server) |
| `src/app/admin/system/roles/RoleManager.tsx` | Create | Client island: create/edit/deactivate/restore modals |
| `src/app/admin/system/roles/[roleKey]/page.tsx` | Create | Permission editor (server) |
| `src/app/admin/system/roles/[roleKey]/PermissionEditor.tsx` | Create | Client island: optimistic toggles + copy-from-role |
| `src/app/admin/system/audit/page.tsx` | Create | System audit tab (server) |
| `src/app/admin/system/audit/export/route.ts` | Create | CSV export GET handler |
| `src/app/admin/system/actions.ts` | Create | All `"use server"` mutations |
| `src/components/admin/ConfirmDialog.tsx` | Create | Focus-trapped confirm modal (modeled on `SlideOver`) |
| `src/app/admin/layout.tsx` | Modify | Add Super-Admin-only nav item |
| `tests/system-helpers.mjs` | Create | Pure-helper unit tests |

### Liveness
SP2 mutations write `SystemModule.isEnabled`, `ModuleRoleAccess.canAccess`, `RolePermission.granted`,
which SP1's `getEffectivePermissions`/`moduleIsEnabled` read live per request. The session cookie carries
only role identity + the super-admin flag (never the permission set), so changes apply on the affected
user's **next request without re-login**. (Role *identity* changes need re-auth — SP3.)

---

## Feature detail

### 5.1 Modules tab (`/admin/system`)
- Server component loads modules via `registry.ts`, grouped by `group`
  (Public Site / Portals / Admin / Compliance / Integrations); resolves each module's `updatedBy`
  (`User.id`) to a display name.
- `ModulesPanel` client island renders cards under group headings. Each card: label, description,
  group badge, last-changed timestamp + Super Admin name, enable/disable toggle, "Manage role access".
- `canDisable:false` modules (`cms`, `public_site`, `audit_log`, `user_management`, `cookie_consent`,
  `system_control`) render the toggle **disabled** with a lock icon + tooltip
  "Required — cannot be disabled."
- **Disabling** → `ConfirmDialog` ("Disabling [Module] immediately removes access for all users.
  Continue?") → `toggleModule(key, false)`. **Enabling** applies with no confirm. No undo-toast.
- `toggleModule(key, enabled)` action: `requireSuperAdmin()` → server-side `canDisable` guard →
  update `isEnabled` + `updatedBy` + `updatedAt` → `audit("system.module.enable"|"system.module.disable",
  "SystemModule", key, {prev, next})` → `revalidatePath("/admin/system")`.

### 5.2 Module Role-Access slide-over
- Opens from a card via the existing `SlideOver`.
- Lists all **active** roles; each row: role label + "Can access this module" toggle.
- `super_admin` row is always checked and **disabled**.
- `setModuleRoleAccess(moduleKey, roleKey, canAccess)`: `requireSuperAdmin()` → reject `super_admin` →
  `upsert` on `@@unique([moduleKey, roleKey])` → `audit("system.module.access", …, {moduleKey, roleKey,
  prev, next})` → revalidate. Applies immediately.

### 5.3 Role Management tab (`/admin/system/roles`)
- Lists all `SystemRole` with a computed **user count** (read staff `User` table once; tally by effective
  role key `customRoleKey ?? role.toLowerCase()`).
- Columns: Role name, Key, Active/Inactive badge, User count, Actions. Inactive roles collapse into an
  "Inactive Roles" section with **Restore**.
- **Create Role** modal: Label (required), Description, "Base on existing role" select (**optional**).
  `createRole`: `requireSuperAdmin()` → slugify label→key → reject key collisions → create `SystemRole`
  (`isSystem:false`, `isActive:true`, `createdBy`) → **seed `ModuleRoleAccess` rows for every module**
  (required — a role with no access rows resolves to zero effective permissions under SP1's engine):
  `canAccess` copied from the base role if one is chosen, else `true` for all modules (matching
  `seedSystem`'s default). If a base role is chosen, also copy its `RolePermission` grants; otherwise
  start with no grants. → `audit("system.role.create", …, {baseRole})` → redirect to permission editor.
- **Edit Role**: label + description only (**key immutable**) → `updateRole` → audit.
- **Deactivate/Restore**:
  - The **7 built-in enum keys** (`super_admin` + the 6) are **protected** from deactivation (control
    disabled + tooltip; server-side `deactivateRole` rejects them). Only **custom** roles are
    deactivatable.
  - Custom roles have **0 users** in SP2 (assignment is SP3), so reassignment is not built here. If a
    custom role unexpectedly has users, `deactivateRole` **blocks** with "N users hold this role —
    reassign them in User Management first."
  - `deactivateRole`/`restoreRole`: `requireSuperAdmin()` → guard → flip `isActive` →
    `audit("system.role.deactivate"|"system.role.restore")`.

### 5.4 Role Permission Editor (`/admin/system/roles/[roleKey]`)
- Full-page server component. Top: read-only summary card (label, description, active user count,
  created date). Body: all `Permission` rows grouped by module in collapsible sections; each row:
  label + description, **Granted** toggle, module badge.
- `super_admin` is blocked at the page level (read-only "Super Admin has unrestricted access" notice).
- `PermissionEditor` client island: each toggle optimistically flips, calls
  `setRolePermission(roleKey, permissionKey, granted)`, reverts on failure. **No debounce** (discrete
  actions).
- `setRolePermission`: `requireSuperAdmin()` → reject `super_admin` → `upsert` on
  `@@unique([roleKey, permissionKey])` with `granted` + `grantedBy` →
  `audit("system.permission.grant"|"system.permission.revoke", "SystemRole", roleKey, {permissionKey,
  prev, next})` → revalidate.
- **Copy From Role**: select another role → `copyRolePermissions(targetRole, sourceRole)` computes the
  **additive** diff (source grants not yet in target) via a pure helper → `ConfirmDialog` shows the
  count + list of permissions to add → on confirm, merge (never revoke) →
  `audit("system.permission.copy", "SystemRole", targetRole, {sourceRole, addedKeys})` (one summary row).

### 5.5 System Audit tab (`/admin/system/audit`) + CSV
- Filtered view: `AuditLog where action startsWith "system."`, newest first.
- Columns: Timestamp, Action, Target (module/role from `metadata`), Changed by (`actorEmail`),
  Previous state, New state (from `metadata`). A helper formats prev/next consistently.
- **CSV export**: `/admin/system/audit/export` GET → `requireSuperAdmin()` → same query → pure CSV
  serializer → `text/csv` with `Content-Disposition: attachment`. A button on the tab links to it.

### Audit action taxonomy
`system.module.enable` · `system.module.disable` · `system.module.access` · `system.role.create` ·
`system.role.update` · `system.role.deactivate` · `system.role.restore` · `system.permission.grant` ·
`system.permission.revoke` · `system.permission.copy`. (SP1's `system.superadmin.create` appears here
too — desirable.) Each writes `metadata` sufficient for the prev/new columns.

---

## Components & isolation

- **`ConfirmDialog`** (new client) — focus-trapped, Esc-to-close, modeled on `SlideOver`'s a11y. Props:
  `open`, `onClose`, `title`, `message`, `confirmLabel`, `onConfirm`. Reused across module-disable,
  deactivate-role, and copy-from-role.
- **`registry.ts`** (server data layer) — pure-ish read functions over `db`; pages stay thin. Mirrors
  `lib/medicaid/cases.ts`.
- **`helpers.ts`** (pure, no `db`, no `server-only`) — the unit-tested core: `slugifyRoleKey`,
  `isBuiltInRoleKey`, `groupModulesByGroup`, `groupPermissionsByModule`, `additivePermissionDiff`,
  `auditRowsToCsv`. Kept free of `server-only`/`db` so `tsx` tests can import it directly (SP1 lesson:
  a `server-only` import breaks node test scripts).
- Server actions import the pure helpers + `db` + `audit`; client islands import the `"use server"`
  actions directly (Next allows calling server actions from client components).

## Error handling
- Actions fail closed: any guard violation (`requireSuperAdmin`, `canDisable`, built-in-role,
  `super_admin`) throws/returns without mutating; invalid input (empty label, key collision) returns
  with no write. Optimistic client toggles revert on action rejection.
- Audit writes use the existing append-only `audit()`; a notification/audit failure must never be
  swallowed silently for mutations (unlike emails) — the mutation + its audit row are written together.

## Testing
Per SP1 convention (standalone `tsx`, DB-free pure; DB behavior verified by running the app/seed):
`tests/system-helpers.mjs` covers `helpers.ts`:
- **slugify** — `"Intake Coordinator"` → `intake_coordinator`; normalizes/strips; stable & idempotent.
- **built-in-role guard** — the 7 enum keys are protected; arbitrary custom keys are not.
- **group-by** — modules grouped by `group`; permissions grouped by `moduleKey` (stable ordering).
- **additive copy diff** — returns only source-minus-target grants; empty when target ⊇ source.
- **CSV** — escapes commas/quotes/newlines; emits a header row; round-trips field count.

Interactive/DB pieces (actions, guards, slide-overs, editor) are verified manually against the seeded
DB, exactly as SP1.

## Done-when (SP2 acceptance)
- [ ] `/admin/system` (+ roles, `roles/[roleKey]`, audit, audit/export) exist; section layout and every
      action call `requireSuperAdmin()`; non-supers are redirected to `/admin/unavailable`.
- [ ] Super-Admin-only "System control" nav item; invisible to others.
- [ ] Modules tab: grouped cards, live enable/disable, `canDisable:false` locked, last-changed shown;
      disabling gated by a confirm dialog (no undo-toast).
- [ ] Role-access slide-over toggles `ModuleRoleAccess` live; `super_admin` row locked.
- [ ] Role Management: create (slugify + copy base), edit (label/desc only), deactivate/restore with
      built-in roles protected and reassignment deferred to SP3.
- [ ] Permission editor: per-toggle live grant/revoke (no debounce); `super_admin` read-only;
      copy-from-role as additive count/list confirm.
- [ ] System audit tab filters `system.*` with prev/new columns; CSV export works.
- [ ] Every mutation writes an audit row with `{prev, next}`; all changes are live per request (no Redis).
- [ ] `tests/system-helpers.mjs` passes; lint + type-check clean.
