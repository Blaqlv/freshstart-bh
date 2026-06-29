# v3 Super Admin — SP4 (Permission-Aware Nav & Module Enforcement) Design Spec

**Date:** 2026-06-29
**Branch:** `feat/v3-superadmin-sp4`
**Predecessors:** SP1 (DB-backed RBAC foundation, PR #18), SP2 (`/admin/system` control panel, PR #19), SP3 (custom role assignment + live identity, PR #20).

## Goal

Close the two gaps SP3 explicitly deferred:

1. **Permission-aware admin nav.** The sidebar (`admin/layout.tsx`) is rendered from the **cookie** session (`getSession()`) and static enum capabilities (`can(session.role, …)`). A custom-role user therefore sees the nav of their *fallback enum role*, not their actual permissions, until they re-login. Convert the nav to render from **live, DB-resolved** permissions so it reflects reality on the next request — matching the guards, which SP3 already made fresh.
2. **Module enforcement for Super Admins.** `requireModule()` is wired into only two routes (medicaid, incidents). Non-Super-Admins are already blocked from a disabled module's route (its permissions are filtered out of `getEffectivePermissions`, so `requireCapability` fails), but **Super Admins bypass capability checks** and can still reach a disabled module's pages. Wire `requireModule()` into every disable-able module route so a disabled module redirects everyone — Super Admins included — to `/admin/unavailable`.

**Non-goals (out of scope):** migrating the ~111 `requireCapability` call sites to granular `hasPermission('module.action')` keys (the capability→permission map already resolves live and correctly — `hasPermission` stays available for future per-action UI gating but is not adopted here); introducing new permission keys for Locations / Public form log; gating `/dashboard` (it lives outside `/admin`). **No DB migration, no seed change.**

## Background (confirmed in code)

- `requireSession()` (SP3) re-resolves `role` / `roleKey` / `isSuperAdmin` / `active` from the DB each request, memoized via React `cache()`.
- `getEffectivePermissions(roleKey)` (request-cached) returns the granted permission keys **already filtered by enabled modules and module access** — so a disabled module contributes no permissions.
- `capabilitiesFromPermissions(granted: Set<string>): Capability[]` (in `capability-map.ts`) maps a granted-permission set back to the satisfied capabilities. This is the bridge that lets the nav keep speaking in capabilities while being driven by live permissions.
- Module routes guard with `await requireModule(key); await requireCapability(cap);` at the top of the route component (confirmed in `incidents/page.tsx`).
- Modules with `canDisable: false` (`cms`, `audit_log`, `user_management`, `system_control`, `public_site`, `cookie_consent`) can never be disabled — wiring `requireModule` on their routes is dead code and is intentionally skipped.

## Design

### Component 1 — `buildAdminNav` pure function

New module `src/lib/admin-nav.ts` isolates all nav-gating logic from the layout so it is unit-testable without `db` / `server-only`:

```ts
import type { Role } from "@prisma/client";
import type { Capability } from "@/lib/rbac";

export type NavItem = { label: string; href: string };

export function buildAdminNav(input: {
  caps: Set<Capability>;
  role: Role;
  isSuperAdmin: boolean;
}): NavItem[];
```

It returns the ordered nav. `caps` is the user's **effective** capability set (super admins get all capabilities). `role` + `isSuperAdmin` cover the two orphan items that have no capability/permission today.

**Nav mapping** — a **faithful 1:1** of today's layout. Each gate uses the *same* capability/role check the current layout uses; the only change is the source: `caps.has(X)` (live, DB-resolved) instead of `can(session.role, X)` (static enum), and `session.role` now comes from `requireSession()` (fresh) instead of the cookie. The gates were cross-checked against each route's actual server-side guard so the nav never shows a link the route would reject (verified: the Providers/Testimonials routes guard `content:read`, not a per-feature capability; Review moderation and Public form log are role-gated, not capability-gated).

| Item | Href | Gate (unchanged from today) |
|---|---|---|
| Dashboard | `/admin` | always |
| Pages | `/admin/pages` | `content:read` |
| Providers | `/admin/providers` | `content:read` |
| Testimonials | `/admin/testimonials` | `content:read` |
| Review moderation | `/admin/reviews` | `role ∈ {ADMINISTRATOR, CLINICAL_DIRECTOR}` OR `isSuperAdmin` |
| Form submissions | `/admin/submissions` | `appointments:read` OR `billing:manage` |
| Insurance verification | `/admin/insurance` | `billing:manage` |
| Payer codes | `/admin/settings/payers` | `billing:manage` |
| Patient intakes | `/admin/intake` | `appointments:read` |
| Patients | `/admin/patients` | `patients:read` |
| Medicaid enrollment | `/admin/medicaid-enrollment` | `enrollment:read` |
| Form management | `/admin/forms` | `forms:manage` |
| Incidents | `/admin/incidents` | `incidents:manage` |
| Public form log | `/admin/public-submissions` | `role ∈ {ADMINISTRATOR, COMPLIANCE_OFFICER, RECEPTIONIST}` OR `isSuperAdmin` |
| Locations | `/admin/locations` | `role === ADMINISTRATOR` OR `isSuperAdmin` |
| Translations | `/admin/translations` | `content:publish` |
| Users | `/admin/users` | `users:manage` |
| Analytics dashboard | `/dashboard` | `dashboard:read` |
| Audit log | `/admin/audit` | `audit:read` |
| Security | `/admin/security` | always |
| System control | `/admin/system` | `isSuperAdmin` |

**Why this is safe:** for the six built-in roles with all modules enabled, `capabilitiesFromPermissions(getEffectivePermissions(roleKey))` equals the role's static capability set (this is exactly the parity SP1's regression test proved for `requireCapability`). So a built-in role's nav is **byte-for-byte unchanged**; only custom-role users (who had no correct enum nav before) and module-disable behavior change.

**Module-awareness (partial, by design):** because `getEffectivePermissions` already drops disabled-module permissions, capability-gated items whose backing module is disabled fall out of `caps` and disappear from the nav automatically. Items gated by **role** (Review moderation, Public form log, Locations) are not capability-backed and so do not auto-hide; their routes' `requireModule`/role guards still enforce access (e.g. disabling `reviews_moderation` leaves the Review moderation link visible, but `/admin/reviews`'s `requireModule` redirects on click). This cosmetic gap is accepted — see Known limitations.

### Component 2 — `admin/layout.tsx` becomes a thin caller

```ts
const cookie = await getSession();
if (!cookie) return <>{children}</>;            // login page renders its own UI
let session: Session;
try { session = await requireSession(); }
catch { return <>{children}</>; }               // deactivated/missing → let the page handle it
const caps = session.isSuperAdmin
  ? new Set(ALL_CAPABILITIES)
  : capabilitiesFromPermissions(await getEffectivePermissions(session.roleKey));
const nav = buildAdminNav({ caps, role: session.role, isSuperAdmin: session.isSuperAdmin });
```

`requireSession()` and `getEffectivePermissions()` are both request-cached and already called by the wrapped page, so this adds **no extra DB round-trips**. `ALL_CAPABILITIES` is exported from `rbac.ts` (the existing `ALL` array, exported). The footer keeps using `session.role` for the role label.

### Component 3 — `requireModule` wiring

Add `await requireModule(<moduleKey>)` as the **first** guard line on every page (list + detail/new sub-pages) under a `canDisable: true` module:

| Module key | Routes |
|---|---|
| `provider_profiles` | `providers/page.tsx`, `providers/[id]/page.tsx` |
| `reviews_moderation` | `testimonials/page.tsx`, `reviews/page.tsx` |
| `appointment_requests` | `submissions/page.tsx`, `submissions/[id]/page.tsx`, `forms/page.tsx` |
| `insurance_verification` | `insurance/page.tsx`, `settings/payers/page.tsx` |
| `intake_portal` | `intake/page.tsx`, `intake/[id]/page.tsx` |
| `patient_portal` | `patients/page.tsx`, `patients/[id]/page.tsx` |
| `multilingual` | `translations/page.tsx` |

(Already wired: `medicaid_enrollment`, `incident_reporting`.) Placement mirrors `incidents/page.tsx`: `requireModule` then `requireCapability`. `requireModule` uses `redirect()` (throws `NEXT_REDIRECT`) so it must sit outside any try/catch — the existing routes already satisfy this.

**Judgment calls (approved):** Payer codes → `insurance_verification`; Patients → `patient_portal` (disabling the patient portal also hides admin patient records).

## Testing

- **TDD — `tests/admin-nav.mjs` (pure `tsx`):** assert `buildAdminNav` produces the exact expected link set for: each built-in role (build its cap set with `new Set(roleCapabilities[role])` and the role enum) — asserting the hrefs match the current layout exactly (the parity guarantee); a narrow custom-role capability subset (e.g. `{patients:read}` → Dashboard + Patients + Security only); and `isSuperAdmin: true` (every link). Explicitly assert the role-gated items (Review moderation, Public form log, Locations) appear only for the right `role` values and always for `isSuperAdmin`, and that an empty cap set for a non-super yields only the always-on links (Dashboard, Security).
- SP1/SP2/SP3 suites stay green; `tsc --noEmit` clean; lint clean for touched files (no new errors in `admin-nav.ts`, `layout.tsx`, or the wired routes); `npm run build` succeeds.
- **Manual smoke:** (1) assign a custom role with a narrow permission set to a user; confirm their admin nav reflects exactly those links on the next request, no re-login. (2) As Super Admin, disable a module (e.g. `reviews_moderation`); confirm the Review moderation + Testimonials links vanish from a non-super's nav AND that a Super Admin deep-linking to `/admin/reviews` is redirected to `/admin/unavailable`. Re-enable and confirm restoration.

## Acceptance (Done-when)

- [ ] `admin/layout.tsx` renders the nav from live DB permissions (`requireSession` + `getEffectivePermissions` + `buildAdminNav`); a custom-role user's nav matches their permissions without re-login.
- [ ] Nav items hide automatically when their backing module is disabled.
- [ ] Every `canDisable: true` module route (and its sub-pages) calls `requireModule`; a Super Admin is redirected to `/admin/unavailable` when that module is off. `canDisable: false` routes are intentionally not wired.
- [ ] `buildAdminNav` is a pure, exported, unit-tested function; `tests/admin-nav.mjs` passes.
- [ ] SP1/SP2/SP3 suites green; `tsc` clean; lint clean for touched files; `npm run build` succeeds.

## Known limitations (deferred to SP5 or never)

- Granular `hasPermission('module.action')` adoption at call sites (capability map remains the guard).
- Locations / Public form log / Review moderation have no capability/permission key — they stay role-gated (now on the fresh role). As a result they do **not** auto-hide when a related module is disabled; the route guards still enforce access. Converting them to permission keys is future work.
- `/dashboard` (analytics) lives outside `/admin` and is not covered by this nav/layout work.
