# v3 Super Admin — SP3 (Custom Role Assignment & Live Identity) Design

**Status:** Approved (design) — 2026-06-28
**Predecessors:** SP1 (DB-backed RBAC foundation, PR #18), SP2 (`/admin/system` control panel, PR #19)

## Problem

SP2 lets Super Admins create, edit, and permission custom roles in `/admin/system`, but those
custom roles are currently **inert**: nothing outside the control panel consumes them.

- `admin/users/actions.ts:setUserRole` only accepts the 6 built-in `Role` **enum** values and writes
  `User.role`. It never sets `User.customRoleKey`, so a custom role can't be assigned to anyone.
- The session is a **stateless jose-signed JWT** (8h, httpOnly cookie) that bakes in `roleKey` and
  `isSuperAdmin`. `requireCapability` resolves permissions live from DB, but against the **token's**
  `roleKey`. So *moving* a user to a different role would not take effect until their token expires or
  they re-login.
- Latent issue: because the JWT is stateless with no revocation, a **deactivated user keeps full
  access until the token expires** (`setUserActive` flips the flag but nothing invalidates the live
  session).

## Goal

Make custom roles assignable and effective:

1. Source the user role picker from `SystemRole` (active roles), so custom roles can be assigned.
2. Refresh session identity from the DB per request, so a role change (or deactivation) takes effect
   on the user's **next request** — no Redis, no forced logout.
3. Notify affected users of role changes (courtesy email).

## Non-Goals (deferred to SP4)

- Converting the admin nav from enum-based `can(session.role, …)` to permission/module-aware.
- Wiring `requireModule` into the remaining module routes (only incidents + medicaid wired today).
- Adopting granular `hasPermission('module.action')` keys at call sites.

## Decisions

- **Re-auth model:** Approach 1 — **live identity re-resolution** (no forced logout, no migration),
  consistent with SP1's "live per request, no Redis." Forced-logout / session-epoch (Approach 2) was
  rejected for login friction + a migration.
- **Assignment privilege gate:** Approach B — built-in role assignment stays `users:manage`; assigning
  a **custom** role requires **Super Admin** (UI hides custom options from non-supers; the action
  re-checks). Prevents lateral privilege escalation and keeps the custom-role lifecycle
  (create → assign → permission) within the Super-Admin boundary.

---

## Section 1 — Live identity refresh (the engine)

Refactor `requireSession()` to re-resolve identity from the DB each request:

- New `getCurrentUser = cache(sub => db.user.findUnique({ where: { id: sub }, select: { id, email,
  name, role, customRoleKey, active, isSuperAdmin } }))` — one indexed read per request, shared across
  all `requireX` calls via React `cache()` (same pattern as `getEffectivePermissions`).
- `requireSession()` decodes the cookie (unchanged `getSession`), then loads the fresh user and returns
  a `Session` whose `role`, `roleKey = effectiveRoleKey(user)`, `isSuperAdmin`, `name`, `email` all come
  **from the DB**. The JWT claims become advisory.
- If the user is **missing or `active === false`** → treated as unauthenticated (existing
  `UNAUTHENTICATED` path → login). This closes the deactivated-user-keeps-access gap.
- **No cookie mutation mid-render:** RSC cannot write cookies, so we do not destroy the cookie inside
  `requireSession`. A stale cookie simply grants nothing because every `requireSession` re-checks the
  DB; it is overwritten on next login.
- `getSession()` (pure cookie decode, edge-safe) is left unchanged for "is anyone logged in" checks.

**Net effect:** reassigning a role or deactivating a user takes effect on their very next request.

---

## Section 2 — Role assignment UI & action

**Pure helpers (`lib/roles.ts`):**

- `enumFromRoleKey(key): Role | null` — inverse of `roleKeyFromEnum` over the 6 enum keys; returns
  `null` for `super_admin` and unknown keys.
- `classifyRoleAssignment(key, { viewerIsSuperAdmin }) → { kind: "builtin" | "custom" | "reject",
  role?: Role }` — pure decision logic, unit-testable without a DB:
  - `super_admin` → `reject` (DB-only via the SP1 script).
  - key maps to an enum (`enumFromRoleKey != null`) → `builtin` + that `role`.
  - otherwise (treated as a custom key) → `custom` if `viewerIsSuperAdmin`, else `reject`. The pure
    helper cannot know whether a custom key actually exists; the **action** validates existence/active
    status against `SystemRole` before writing.

**Registry (`lib/system/registry.ts`):** add `assignableRoles()` → active `SystemRole`s **excluding
`super_admin`**, distinguishing built-in (`isSystem: true`) from custom (`isSystem: false`).

**`admin/users/page.tsx`:** the per-row role `<select>` is sourced from `assignableRoles()` instead of
the hardcoded 6-enum array. Custom-role `<option>`s render **only when the viewer is a Super Admin**
(non-supers see built-ins only). Each row shows the user's current **effective** role label. The
create-user form stays **built-in-only** (assign custom roles after creation).

**`admin/users/actions.ts` — `setUserRole`:**

1. `requireCapability("users:manage")`; reject if `id === session.sub`.
2. Classify the submitted key via `classifyRoleAssignment(key, { viewerIsSuperAdmin: session.isSuperAdmin })`:
   - **reject** → no-op (`super_admin` is DB-only via the SP1 script).
   - **builtin** → set `role = <enum>`, `customRoleKey = null`.
   - **custom** → **re-check `session.isSuperAdmin` in the action** (defense-in-depth, not just hidden
     UI); verify the role exists, `isActive`, and `isSystem === false`; set `customRoleKey = key`
     (keep the existing `role` enum as a fallback for the not-yet-permission-aware nav).
3. Audit `user.role` with `{ from: <prevEffectiveKey>, to: <newEffectiveKey> }`.
4. Best-effort `sendEmail` to the user (never fails the action).
5. `revalidatePath("/admin/users")`.

---

## Section 3 — Email + audit

- **Email** via existing `sendEmail({ to, subject, text, html })` (`lib/notify.ts`, returns `boolean`).
  To the affected user: subject "Your access role has changed", body names the new role label.
  Fire-and-forget — a `false` return or throw is swallowed so a role change never blocks on email.
- **Audit** extends the existing `user.role` action with `from`/`to` effective-key metadata, surfacing
  the transition in the general `/admin/audit` (a `user.*` row, consistent with where user management
  already audits — not `system.*`).

---

## Section 4 — Testing

Pure `tsx` tests (`tests/role-assignment.mjs`), no DB:

- `enumFromRoleKey` round-trips with `roleKeyFromEnum` for all 6 enum roles; returns `null` for
  `super_admin` and unknown keys.
- `classifyRoleAssignment`: each built-in key → `builtin` with the correct enum; a custom key with a
  Super-Admin viewer → `custom`; a custom key with a non-super viewer → `reject`; `super_admin` →
  `reject`.

DB-bound pieces (identity refresh, registry query, the action) rely on type-check + build + manual
smoke, consistent with the repo's testing style. Re-run SP1/SP2 suites
(`roles.mjs`, `capability-map.mjs`, `permissions-resolve.mjs`, `system-helpers.mjs`) to guard against
drift.

## File map

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/lib/auth.ts` | Modify | `requireSession` refreshes identity from DB via cached `getCurrentUser`; inactive/missing → unauthenticated |
| `src/lib/roles.ts` | Modify | Add pure `enumFromRoleKey` + `classifyRoleAssignment` |
| `src/lib/system/registry.ts` | Modify | Add `assignableRoles()` (active, exclude `super_admin`, split built-in/custom) |
| `src/app/admin/users/actions.ts` | Modify | `setUserRole` handles built-in + custom with Super-Admin gate, email, audit |
| `src/app/admin/users/page.tsx` | Modify | Role dropdown from `assignableRoles()`; custom options Super-Admin-only; show effective role label |
| `tests/role-assignment.mjs` | Create | Pure helper unit tests |

## Done-when (SP3 acceptance)

- A Super Admin can assign a custom role to a user from `/admin/users`; the change takes effect on that
  user's next request (verified by their resolved permissions/super-admin status).
- A non-Super-Admin user-manager sees only built-in roles in the dropdown; submitting a custom key is
  rejected server-side.
- Deactivating a user revokes their live access on their next request (latent gap closed).
- Each role change writes a `user.role` audit row with `from`/`to` and sends a best-effort email.
- `tests/role-assignment.mjs` passes; SP1/SP2 suites still green; lint + type-check clean; build
  succeeds.
