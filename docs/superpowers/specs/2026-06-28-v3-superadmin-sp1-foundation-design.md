# v3 Super Admin — SP1: Foundation (Design)

**Date:** 2026-06-28
**Status:** Approved design, ready for implementation plan
**Source prompt:** `prompt-3-super-admin-control-panel.md` (Super Admin: System Module & Role Availability Control)

## Context

Prompt 3 introduces a Super Admin tier that can toggle system modules, control which
roles reach which modules, create/rename/deactivate roles, and edit per-role
permissions — all at runtime, no redeploy, all audited. The prompt was written against
a generic stack and diverges from this codebase in four consequential ways:

| Prompt assumes | Fresh Start actually has |
|---|---|
| `User.roleKey` (string FK → `SystemRole`) | `User.role` is a Prisma `Role` enum (6 fixed values), carried in the JWT cookie |
| `middleware.ts` module route guard | No `middleware.ts`; all guards live in server components/layouts via `requireCapability()` (111 call sites) |
| `hasPermission()` does 4 DB lookups/request | Role travels in the signed session cookie; edge verification does zero DB calls |
| Redis cache (60s TTL) | No Redis; Neon serverless Postgres on Vercel |
| Audit table with prev/new-state columns | `AuditLog` exists with `metadata Json` + append-only `audit()` helper |

A capability-based RBAC already exists (`can(role, capability)` in `src/lib/rbac.ts`)
— effectively a static version of what Prompt 3 makes dynamic. So this work is "make
the existing capability map database-driven and toggleable," not "build from scratch."

### Decisions locked during brainstorming

1. **Role model: Hybrid.** Keep the `Role` enum as the 6 built-ins; seed matching
   `SystemRole` rows; add an optional `User.customRoleKey` for runtime-created roles.
2. **Caching: Session-carried role + per-request cache.** No Redis, no new infra.
3. **Enforcement: Server-side guards.** Extend the existing `requireCapability()`
   pattern; no edge middleware for module state (it can't read Neon cheaply).
4. **Scope: Decompose into 3 sub-projects; spec & build SP1 first.**
5. **Capability bridge: Back `can()`/`requireCapability()` with the DB.** No 111-site
   rewrite; reimplement the enforcement entry point to read dynamic state.

### Sub-project decomposition

- **SP1 — Foundation (this spec):** schema, seeds, permission engine, capability
  bridge, server guards, setup script, docs, tests.
- **SP2 — Control Panel UI:** `/admin/system` with module, role-access, role-mgmt,
  permission-editor, and audit tabs.
- **SP3 — User-management integration:** role dropdown from `SystemRole`, role-change
  email notifications, forced re-auth on role change.

This spec covers **SP1 only**.

## Goal

Ship the database-backed authorization backbone: every authorization check that runs
today against the static capability map runs instead against live, Super-Admin-editable
module/role/permission state — with provably identical default behavior — plus the
seed data, the `isSuperAdmin` flag, the secure setup path, and documentation. No UI
and no user-management changes in SP1.

## Architecture

### A. Data model (Prisma)

Add five models from the prompt verbatim in intent (relations keyed on the `@unique`
`key` columns, matching the prompt's schema):

- `SystemModule` — `key` (unique), `label`, `description`, `isEnabled` (default true),
  `group`, `canDisable` (default true), `updatedAt`, `updatedBy String?`, `roleAccess`.
- `ModuleRoleAccess` — `moduleKey`, `roleKey`, `canAccess` (default true);
  `@@unique([moduleKey, roleKey])`; relations to `SystemModule.key` and `SystemRole.key`.
- `SystemRole` — `key` (unique), `label`, `description`, `isSystem` (default false),
  `isActive` (default true), timestamps, `createdBy String?`; relations `permissions`,
  `moduleAccess`. (No `users` relation in SP1 — see hybrid note below.)
- `Permission` — `key` (unique), `label`, `description`, `moduleKey`; `rolePermissions`.
- `RolePermission` — `roleKey`, `permissionKey`, `granted` (default true), `grantedAt`,
  `grantedBy String?`; `@@unique([roleKey, permissionKey])`; relations to `SystemRole.key`
  and `Permission.key`.

Add to `User`:

- `isSuperAdmin Boolean @default(false)`
- `customRoleKey String?`

**Hybrid mapping.** The `Role` enum is retained. A user's **effective role key** is
`customRoleKey ?? roleKeyFromEnum(role)`. The 6 enum values map 1:1 to seeded
`SystemRole.key`s (`ADMINISTRATOR` → `administrator`, `CLINICAL_DIRECTOR` →
`clinical_director`, etc.). `customRoleKey` is a loose string reference to
`SystemRole.key` (not a Prisma relation), mirroring the existing loose-key pattern in
`ModuleRoleAccess`/`RolePermission`; it lets a user be assigned a runtime-created role
that the enum cannot represent. Assigning `customRoleKey` via UI is an SP3 concern; SP1
only reads it.

Migration: one additive Prisma migration (`migrate dev` locally; `migrate deploy` on
real DBs per the project's established flow — see `v2-ehr-eligibility-medicaid` memory).
No destructive changes; the `Role` enum and all existing columns are untouched.

### B. Seeds

New files under `prisma/seeds/`, invoked idempotently from the existing `prisma/seed.ts`
via upserts (keyed on `key` / composite unique):

- `roles.ts` — 7 `SystemRole` rows: `super_admin` and `administrator` with
  `isSystem: true`; `clinical_director`, `compliance_officer`, `receptionist`,
  `provider`, `billing_staff` with `isSystem: false`. All `isActive: true`.
- `modules.ts` — all **26** modules from the prompt's table with their `group` and
  `canDisable` values. (The prompt's final-checklist line says "25 modules"; the table
  enumerates 26 including `system_control`. SP1 seeds all 26; the "25" is a prompt
  miscount and is documented here, not reconciled by dropping a module.)
- `permissions.ts` — the granular permission keys from Prompt 3 Part 3, each tagged with
  its owning `moduleKey`.
- `role-permissions.ts` — the default grant matrix (Prompt 3 Part 3) for the 6 non-super
  roles. `super_admin` receives **no** `RolePermission` rows; it bypasses via the flag.
- `module-role-access.ts` — default `canAccess: true` for every (module × the 6
  non-super roles). The Super Admin restricts access later in SP2. `super_admin` needs no
  rows (implicit full access).

Seeds are re-runnable: a second `db:seed` must not duplicate or clobber Super-Admin edits
made after seeding. Upserts update label/description/group/canDisable for modules and
labels for roles, but do **not** reset `isEnabled`, `RolePermission.granted`, or
`ModuleRoleAccess.canAccess` if a row already exists (so re-seeding never silently
re-enables a module an admin disabled). New rows are created with documented defaults.

### C. Permission engine

`src/lib/roles.ts`:
- `roleKeyFromEnum(role: Role): string` — enum → lowercase key.
- `effectiveRoleKey(user | session): string` — `customRoleKey ?? roleKeyFromEnum(role)`.

`src/lib/permissions.ts`:
- `getEffectivePermissions(roleKey: string): Promise<Set<string>>` — resolves
  `RolePermission` where `granted` ∧ owning module `isEnabled` ∧ `ModuleRoleAccess.canAccess`
  for that (module, role). Memoized per request with React `cache()` so repeated checks
  in one render/request hit the DB once.
- `hasPermission(session, permissionKey): Promise<boolean>` — `isSuperAdmin` → true;
  else module enabled → module access → permission granted.
- `moduleIsEnabled(moduleKey): Promise<boolean>` — cached lookup.
- `requireModule(moduleKey): Promise<void>` — redirects to `/admin/unavailable?m=<key>`
  when disabled.
- `requireSuperAdmin(): Promise<Session>` — redirects non-supers to `/admin/unavailable`.

All reads use the per-request cache; a single page render resolves the module map and the
role's permission set once.

### D. Capability bridge (non-breaking)

`requireCapability(capability)` in `src/lib/auth.ts` remains the enforcement entry point
at all 111 existing call sites — **no call-site edits in SP1**. Its body is reimplemented
to:
1. Short-circuit `true` for `isSuperAdmin`.
2. Look up the capability in a seeded/static **capability → permission(s)** map
   (`src/lib/rbac.ts`).
3. Return true only if the effective permission set (from `getEffectivePermissions`)
   contains all mapped permissions for that capability.

The capability→permission map is authored so that, given the seeded default grants, every
role resolves to exactly its current capability set (verified by the regression test in
§H). The synchronous `can(role, capability)` is retained for cosmetic nav hints and
documented as "reflects static defaults — not a security boundary"; security-critical
paths use the async `requireCapability`.

Because permissions are read **live per request** (not from the cookie), toggling a
permission or disabling a module in SP2 changes enforcement on the very next request.

### E. Session model

`Session` (in `src/lib/auth.ts`) and the JWT payload gain:
- `isSuperAdmin: boolean`
- `roleKey: string` (the effective role key at login)

Set at login (`createSessionCookie`). This keeps the super-admin bypass and role identity
cheap (no DB hit to know who you are). **Only role identity is cookie-bound; the
permissions for that role are read live.** Therefore:
- Permission/module toggles take effect immediately (next request).
- Changing *which* role a user has, or the `isSuperAdmin` flag, is cookie-bound until
  re-login or cookie expiry (8h). Forced re-auth on role change is SP3.

`verifySession` tolerates older cookies lacking the new fields (treat missing
`isSuperAdmin` as false, missing `roleKey` as derived from `role`) so existing sessions
don't break on deploy.

### F. Module-route guard & unavailable page

No edge middleware. Module-route blocking is done with `requireModule(moduleKey)` inside
the relevant admin layouts/pages (added where a route maps to a toggleable module). SP1
delivers the guard helper and the page:

- `/admin/unavailable` — "This feature is currently unavailable. Contact your system
  administrator." For Super Admins, also shows the module key from `?m=` so they know
  which toggle to flip.

SP1 wires `requireModule` into a representative set of already-existing module routes
(e.g. `medicaid_enrollment`, `analytics_dashboard`, `ehr_integration`) to prove the
pattern; remaining route wiring is mechanical and completed alongside SP2.

### G. Setup script & docs

- `scripts/create-super-admin.ts` (run via `tsx`): interactive CLI. Prompts for an email;
  if the user exists, sets `isSuperAdmin: true`; if not, creates the user with a secure
  random temporary password (and triggers a reset email if `src/lib/notify.ts` supports
  it, otherwise prints next steps). Writes an audit entry: "Super Admin account created
  via setup script." Refuses to proceed silently if 2 Super Admins already exist (warns).
- `README_SUPERADMIN.md`: the flag is settable only via DB or this script; ≤2 Super
  Admins; revoke via direct DB update (`isSuperAdmin: false`); Super Admin actions are
  logged separately and not editable by Administrators; how to run the script.

**No UI path sets `isSuperAdmin`.** SP1 adds no such path; SP3's user-edit form must
exclude it and exclude `super_admin` from any role dropdown.

### H. Audit conventions

Reuse the existing `audit()` helper. SP1 defines the action vocabulary SP2 will emit and
uses it in the setup script:
- `system.module.enable` / `system.module.disable`
- `system.module_access.change`
- `system.role.create` / `system.role.update` / `system.role.deactivate` /
  `system.role.restore`
- `system.permission.grant` / `system.permission.revoke`
- `system.superadmin.create` (setup script)

Previous/new state is stored in `metadata` (e.g. `{ moduleKey, from: true, to: false }`),
matching the existing append-only `AuditLog` shape. No schema change to `AuditLog`.

## Testing

- **Regression (critical):** for each of the 6 enum roles, assert the DB-backed effective
  capability set (resolved through the bridge from seeded data) **equals** the current
  static `roleCapabilities[role]`. This proves SP1 changes nothing about live access.
- `hasPermission`: super-admin bypass; module disabled → false; module access false →
  false; permission not granted → false; fully granted → true.
- `roleKeyFromEnum` / `effectiveRoleKey`: enum mapping and `customRoleKey` override.
- `moduleIsEnabled` / `requireModule`: enabled passes, disabled redirects.
- Seed idempotency: running `db:seed` twice yields the same row counts and does not reset
  an `isEnabled: false` module or a revoked grant.
- Session back-compat: a cookie minted before SP1 (no `isSuperAdmin`/`roleKey`) verifies
  and resolves to a sane effective role.

## Out of scope (SP1)

- The `/admin/system` control panel UI and all its tabs/slide-overs (SP2).
- User-management role dropdown sourced from `SystemRole`, role-change email
  notifications, and forced re-auth on role change (SP3).
- Migrating all 111 capability call sites to granular `hasPermission('module.action')`
  keys — the bridge preserves them; granular adoption is incremental, later.
- Adding edge middleware.
- Any change to the `AuditLog` schema.

## Risks & mitigations

- **Bridge drift** (DB-backed capabilities ≠ static defaults): mitigated by the §H
  regression test gating the change.
- **Re-seed clobbering admin edits:** mitigated by upserts that never reset
  `isEnabled`/`granted`/`canAccess` on existing rows.
- **Stale role on cookie:** documented and bounded by 8h TTL; permission toggles are
  unaffected (read live); forced re-auth deferred to SP3.
- **Relation-to-`key` Prisma quirks:** relations reference `@unique` non-id columns;
  validated by `prisma generate` + migration during implementation.
