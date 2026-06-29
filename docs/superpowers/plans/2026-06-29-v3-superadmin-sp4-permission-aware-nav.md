# v3 Super Admin — SP4 (Permission-Aware Nav & Module Enforcement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the admin sidebar from each user's live, DB-resolved permissions (so custom-role users see the correct nav without re-login) and enforce module-disabled state on every disable-able admin route for Super Admins too.

**Architecture:** A new pure `buildAdminNav()` function (unit-tested with `tsx`) owns all nav-gating logic; `admin/layout.tsx` becomes a thin caller that resolves fresh identity via `requireSession()`, derives effective capabilities with `capabilitiesFromPermissions(getEffectivePermissions(roleKey))`, and renders the result. Separately, `requireModule(<key>)` is added to every `canDisable: true` module route (list + detail/sub-pages). No DB migration, no seed change, no route capability-guard changes.

**Tech Stack:** Next.js 16 (App Router, server components), Prisma 6 + Neon, jose JWT, React `cache()`, Tailwind, `tsx` for pure unit tests (no Jest/Vitest).

---

## Repo conventions (read before starting)

- **Auth:** `requireSession()` (`@/lib/auth`) returns a `Session` (`{ sub, email, name, role, roleKey, isSuperAdmin }`) re-resolved from the DB each request; it **throws** `"UNAUTHENTICATED"` when there's no cookie or the user is missing/inactive. `getSession()` is the pure cookie decode (returns `Session | null`). `requireModule(moduleKey)` calls `redirect()` (throws `NEXT_REDIRECT`) — must be called **outside** any try/catch.
- **RBAC:** `Capability` union, `roleCapabilities: Record<Role, Capability[]>`, `can(role, cap)`, `roleLabels` from `@/lib/rbac`. The private `ALL: Capability[]` array lists every capability.
- **Permissions:** `getEffectivePermissions(roleKey): Promise<Set<string>>` (request-cached, already filtered by enabled modules) from `@/lib/permissions`. `capabilitiesFromPermissions(granted: Set<string>): Capability[]` from `@/lib/capability-map`.
- **Tests are pure `tsx`** importing `.ts`/`.tsx`-free modules via relative paths; `tsx` resolves `@/...` aliases. Keep tested modules free of `server-only`/`db`/JSX. Run with `npx tsx tests/<name>.mjs`.
- **Lint/type/build:** `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, `npm run build`.
- **Module route guard pattern** (from `incidents/page.tsx`): `await requireModule("<key>"); await requireCapability("<cap>");` as the first lines of the default-exported async component, before any data fetch.

## File map

| File | Create/Modify | Responsibility |
|---|---|---|
| `src/lib/rbac.ts` | Modify | Export the existing `ALL` array as `ALL_CAPABILITIES` |
| `src/lib/admin-nav.ts` | Create | Pure `buildAdminNav({ caps, role, isSuperAdmin })` → `NavItem[]` |
| `tests/admin-nav.mjs` | Create | Pure unit tests for `buildAdminNav` (parity + custom + super) |
| `src/app/admin/layout.tsx` | Modify | Resolve fresh identity, derive caps, call `buildAdminNav` |
| `src/app/admin/providers/page.tsx` | Modify | `requireModule("provider_profiles")` |
| `src/app/admin/providers/[id]/page.tsx` | Modify | `requireModule("provider_profiles")` |
| `src/app/admin/testimonials/page.tsx` | Modify | `requireModule("reviews_moderation")` |
| `src/app/admin/reviews/page.tsx` | Modify | `requireModule("reviews_moderation")` |
| `src/app/admin/submissions/page.tsx` | Modify | `requireModule("appointment_requests")` |
| `src/app/admin/submissions/[id]/page.tsx` | Modify | `requireModule("appointment_requests")` |
| `src/app/admin/forms/page.tsx` | Modify | `requireModule("appointment_requests")` |
| `src/app/admin/insurance/page.tsx` | Modify | `requireModule("insurance_verification")` |
| `src/app/admin/settings/payers/page.tsx` | Modify | `requireModule("insurance_verification")` |
| `src/app/admin/intake/page.tsx` | Modify | `requireModule("intake_portal")` |
| `src/app/admin/intake/[id]/page.tsx` | Modify | `requireModule("intake_portal")` |
| `src/app/admin/patients/page.tsx` | Modify | `requireModule("patient_portal")` |
| `src/app/admin/patients/[id]/page.tsx` | Modify | `requireModule("patient_portal")` |
| `src/app/admin/translations/page.tsx` | Modify | `requireModule("multilingual")` |

(Already wired: `medicaid-enrollment/*` → `medicaid_enrollment`, `incidents` → `incident_reporting`.)

---

## Task 1: Export `ALL_CAPABILITIES` from `rbac.ts`

**Files:**
- Modify: `src/lib/rbac.ts`

- [ ] **Step 1: Export the capability list**

In `src/lib/rbac.ts`, change the private `ALL` declaration (currently `const ALL: Capability[] = [ … ];`) to an exported, readonly-friendly alias. Replace:

```ts
const ALL: Capability[] = [
```

with:

```ts
export const ALL_CAPABILITIES: Capability[] = [
```

Then update the two existing internal references to `ALL` (the `ADMINISTRATOR: ALL,` entry in `roleCapabilities`) to use the new name:

```ts
export const roleCapabilities: Record<Role, Capability[]> = {
  ADMINISTRATOR: ALL_CAPABILITIES,
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rbac.ts
git commit -m "refactor(sp4): export ALL_CAPABILITIES from rbac"
```

---

## Task 2: Pure `buildAdminNav` + tests (TDD)

**Files:**
- Create: `src/lib/admin-nav.ts`
- Test: `tests/admin-nav.mjs`

- [ ] **Step 1: Write the failing test `tests/admin-nav.mjs`**

```js
// tests/admin-nav.mjs
import assert from "node:assert";
import { buildAdminNav } from "../src/lib/admin-nav.ts";
import { roleCapabilities } from "../src/lib/rbac.ts";

const hrefs = (items) => items.map((i) => i.href);

// Super admin sees every link (21 items).
const sa = buildAdminNav({ caps: new Set(), role: "ADMINISTRATOR", isSuperAdmin: true });
assert.deepStrictEqual(hrefs(sa), [
  "/admin", "/admin/pages", "/admin/providers", "/admin/testimonials", "/admin/reviews",
  "/admin/submissions", "/admin/insurance", "/admin/settings/payers", "/admin/intake",
  "/admin/patients", "/admin/medicaid-enrollment", "/admin/forms", "/admin/incidents",
  "/admin/public-submissions", "/admin/locations", "/admin/translations", "/admin/users",
  "/dashboard", "/admin/audit", "/admin/security", "/admin/system",
], "super admin: all links in order");

// Empty caps, non-super, non-privileged role -> only always-on links.
const none = buildAdminNav({ caps: new Set(), role: "PROVIDER", isSuperAdmin: false });
assert.deepStrictEqual(hrefs(none), ["/admin", "/admin/security"], "empty caps -> dashboard + security only");

// Narrow custom role: patients:read only.
const pat = buildAdminNav({ caps: new Set(["patients:read"]), role: "PROVIDER", isSuperAdmin: false });
assert.deepStrictEqual(hrefs(pat), ["/admin", "/admin/patients", "/admin/security"], "patients:read -> patients link");

// Role-gated items: Review moderation only for ADMINISTRATOR / CLINICAL_DIRECTOR.
const cd = buildAdminNav({ caps: new Set(), role: "CLINICAL_DIRECTOR", isSuperAdmin: false });
assert.ok(hrefs(cd).includes("/admin/reviews"), "clinical director sees review moderation");
const recep = buildAdminNav({ caps: new Set(), role: "RECEPTIONIST", isSuperAdmin: false });
assert.ok(!hrefs(recep).includes("/admin/reviews"), "receptionist does not see review moderation");

// Role-gated: Public form log for ADMIN/COMPLIANCE/RECEPTIONIST; Locations only ADMINISTRATOR.
assert.ok(hrefs(recep).includes("/admin/public-submissions"), "receptionist sees public form log");
assert.ok(!hrefs(recep).includes("/admin/locations"), "receptionist does not see locations");
const admin = buildAdminNav({ caps: new Set(["content:read"]), role: "ADMINISTRATOR", isSuperAdmin: false });
assert.ok(hrefs(admin).includes("/admin/locations"), "administrator (non-super) sees locations");

// Parity: a built-in role's capability set yields the same links the static layout would.
// COMPLIANCE_OFFICER caps -> content:read, audit:read, incidents:manage, dashboard:read, enrollment:read/manage.
const comp = buildAdminNav({
  caps: new Set(roleCapabilities.COMPLIANCE_OFFICER),
  role: "COMPLIANCE_OFFICER",
  isSuperAdmin: false,
});
assert.deepStrictEqual(hrefs(comp), [
  "/admin", "/admin/pages", "/admin/providers", "/admin/testimonials", "/admin/medicaid-enrollment",
  "/admin/incidents", "/admin/public-submissions", "/dashboard", "/admin/audit", "/admin/security",
], "compliance officer parity");

console.log("admin-nav test PASSED");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx tests/admin-nav.mjs`
Expected: FAIL — cannot find module `../src/lib/admin-nav.ts` / `buildAdminNav` is not defined.

- [ ] **Step 3: Create `src/lib/admin-nav.ts`**

```ts
import type { Role } from "@prisma/client";
import type { Capability } from "@/lib/rbac";

export type NavItem = { label: string; href: string };

/** Build the admin sidebar from a user's *effective* capabilities + role.
 *  Pure: no DB, no server-only. The caller resolves `caps` from live
 *  permissions (super admins pass `isSuperAdmin: true` and get everything). */
export function buildAdminNav(input: {
  caps: Set<Capability>;
  role: Role;
  isSuperAdmin: boolean;
}): NavItem[] {
  const { caps, role, isSuperAdmin } = input;
  const has = (c: Capability) => isSuperAdmin || caps.has(c);
  const roleIn = (...roles: Role[]) => isSuperAdmin || roles.includes(role);

  const nav: NavItem[] = [{ label: "Dashboard", href: "/admin" }];

  if (has("content:read")) {
    nav.push(
      { label: "Pages", href: "/admin/pages" },
      { label: "Providers", href: "/admin/providers" },
      { label: "Testimonials", href: "/admin/testimonials" },
    );
  }
  if (roleIn("ADMINISTRATOR", "CLINICAL_DIRECTOR")) {
    nav.push({ label: "Review moderation", href: "/admin/reviews" });
  }
  if (has("appointments:read") || has("billing:manage")) {
    nav.push({ label: "Form submissions", href: "/admin/submissions" });
  }
  if (has("billing:manage")) {
    nav.push(
      { label: "Insurance verification", href: "/admin/insurance" },
      { label: "Payer codes", href: "/admin/settings/payers" },
    );
  }
  if (has("appointments:read")) nav.push({ label: "Patient intakes", href: "/admin/intake" });
  if (has("patients:read")) nav.push({ label: "Patients", href: "/admin/patients" });
  if (has("enrollment:read")) nav.push({ label: "Medicaid enrollment", href: "/admin/medicaid-enrollment" });
  if (has("forms:manage")) nav.push({ label: "Form management", href: "/admin/forms" });
  if (has("incidents:manage")) nav.push({ label: "Incidents", href: "/admin/incidents" });
  if (roleIn("ADMINISTRATOR", "COMPLIANCE_OFFICER", "RECEPTIONIST")) {
    nav.push({ label: "Public form log", href: "/admin/public-submissions" });
  }
  if (roleIn("ADMINISTRATOR")) nav.push({ label: "Locations", href: "/admin/locations" });
  if (has("content:publish")) nav.push({ label: "Translations", href: "/admin/translations" });
  if (has("users:manage")) nav.push({ label: "Users", href: "/admin/users" });
  if (has("dashboard:read")) nav.push({ label: "Analytics dashboard", href: "/dashboard" });
  if (has("audit:read")) nav.push({ label: "Audit log", href: "/admin/audit" });

  // Security (own MFA enrollment) is available to every signed-in staff member.
  nav.push({ label: "Security", href: "/admin/security" });

  if (isSuperAdmin) nav.push({ label: "System control", href: "/admin/system" });

  return nav;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx tests/admin-nav.mjs`
Expected: `admin-nav test PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-nav.ts tests/admin-nav.mjs
git commit -m "feat(sp4): pure buildAdminNav from effective capabilities (TDD)"
```

---

## Task 3: Wire `buildAdminNav` into `admin/layout.tsx`

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Replace the imports**

Replace the current top imports:

```ts
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { roleLabels } from "@/lib/rbac";
import { Sidebar, type NavItem } from "@/components/admin/Sidebar";
import { StatusPill } from "@/components/StatusPill";
import { logout } from "./actions";
```

with:

```ts
import type { Metadata } from "next";
import type { Session } from "@/lib/auth";
import { getSession, requireSession } from "@/lib/auth";
import { roleLabels, ALL_CAPABILITIES } from "@/lib/rbac";
import { getEffectivePermissions } from "@/lib/permissions";
import { capabilitiesFromPermissions } from "@/lib/capability-map";
import { buildAdminNav } from "@/lib/admin-nav";
import { Sidebar } from "@/components/admin/Sidebar";
import { StatusPill } from "@/components/StatusPill";
import { logout } from "./actions";
```

(`NavItem` is no longer imported here — `buildAdminNav` owns it. `can` is no longer used.)

- [ ] **Step 2: Replace the session + nav-building block**

Replace everything from `const session = await getSession();` down to (and including) the closing `if (session.isSuperAdmin) nav.push(...)` line — i.e. the entire nav-construction block — with:

```ts
  const cookie = await getSession();
  // Unauthenticated: the login page renders its own full-screen UI.
  if (!cookie) return <>{children}</>;

  let session: Session;
  try {
    session = await requireSession();
  } catch {
    // User went missing/inactive since the cookie was issued — let the page
    // (its own guards) handle it; render children without the admin chrome.
    return <>{children}</>;
  }

  const caps = session.isSuperAdmin
    ? new Set(ALL_CAPABILITIES)
    : capabilitiesFromPermissions(await getEffectivePermissions(session.roleKey));
  const nav = buildAdminNav({ caps, role: session.role, isSuperAdmin: session.isSuperAdmin });
```

The remainder of the component (the returned JSX: `<aside>`, `<Sidebar items={nav} />`, the `{session.name}` / `roleLabels[session.role]` footer, `logout`, `<StatusPill />`) is unchanged.

- [ ] **Step 3: Type-check + lint the touched file**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors; no `admin/layout` or `admin-nav` file appears in lint output (in particular, no "unused `can`/`NavItem`" warnings).

- [ ] **Step 4: Re-run the full pure-test suite (guard against drift)**

Run: `npx tsx tests/admin-nav.mjs && npx tsx tests/role-assignment.mjs && npx tsx tests/roles.mjs && npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs && npx tsx tests/system-helpers.mjs`
Expected: every line prints `… PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat(sp4): render admin nav from live permissions (buildAdminNav)"
```

---

## Task 4: Wire `requireModule` into the disable-able routes

Each step adds two edits to one route file: (a) ensure `requireModule` is imported from `@/lib/auth`, and (b) add `await requireModule("<key>");` as the **first** statement inside the default-exported async component, immediately before the existing first guard (`requireCapability` or `requireSession`). Routes that already import `requireCapability` only need it widened to `requireCapability, requireModule`; routes that import `requireSession` need `requireModule` added to that import.

- [ ] **Step 1: `provider_profiles` — providers list + detail**

In `src/app/admin/providers/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add as the first line of the component (before `const session = await requireCapability("content:read");`):

```ts
  await requireModule("provider_profiles");
```

In `src/app/admin/providers/[id]/page.tsx`: same import change, and add `await requireModule("provider_profiles");` before `const session = await requireCapability("content:read");`.

- [ ] **Step 2: `reviews_moderation` — testimonials + review moderation**

In `src/app/admin/testimonials/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add `await requireModule("reviews_moderation");` before `const session = await requireCapability("content:read");`.

In `src/app/admin/reviews/page.tsx`: change `import { requireSession } from "@/lib/auth";` → `import { requireSession, requireModule } from "@/lib/auth";`, and add `await requireModule("reviews_moderation");` before `const session = await requireSession();`.

- [ ] **Step 3: `appointment_requests` — submissions list + detail + form management**

In `src/app/admin/submissions/page.tsx`: change `import { requireSession } from "@/lib/auth";` → `import { requireSession, requireModule } from "@/lib/auth";`, and add `await requireModule("appointment_requests");` before `const session = await requireSession();`.

In `src/app/admin/submissions/[id]/page.tsx`: same import change, and add `await requireModule("appointment_requests");` before the existing `const session = await requireSession();` line.

In `src/app/admin/forms/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add `await requireModule("appointment_requests");` before `await requireCapability("forms:manage");`.

- [ ] **Step 4: `insurance_verification` — insurance + payer codes**

In `src/app/admin/insurance/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add `await requireModule("insurance_verification");` before `await requireCapability("billing:manage");`.

In `src/app/admin/settings/payers/page.tsx`: same import change, and add `await requireModule("insurance_verification");` before `await requireCapability("billing:manage");`.

- [ ] **Step 5: `intake_portal` — intake list + detail**

In `src/app/admin/intake/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add `await requireModule("intake_portal");` before `await requireCapability("appointments:read");`.

In `src/app/admin/intake/[id]/page.tsx`: same import change, and add `await requireModule("intake_portal");` before `const session = await requireCapability("appointments:read");`.

- [ ] **Step 6: `patient_portal` — patients list + detail**

In `src/app/admin/patients/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add `await requireModule("patient_portal");` before `await requireCapability("patients:read");`.

In `src/app/admin/patients/[id]/page.tsx`: same import change, and add `await requireModule("patient_portal");` before `const session = await requireCapability("patients:read");`.

- [ ] **Step 7: `multilingual` — translations**

In `src/app/admin/translations/page.tsx`: change `import { requireCapability } from "@/lib/auth";` → `import { requireCapability, requireModule } from "@/lib/auth";`, and add `await requireModule("multilingual");` before `await requireCapability("content:publish");`.

- [ ] **Step 8: Type-check + lint the touched files**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors; no `admin/providers`, `admin/testimonials`, `admin/reviews`, `admin/submissions`, `admin/forms`, `admin/insurance`, `admin/settings/payers`, `admin/intake`, `admin/patients`, or `admin/translations` file appears in lint output.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/providers src/app/admin/testimonials src/app/admin/reviews src/app/admin/submissions src/app/admin/forms src/app/admin/insurance src/app/admin/settings/payers src/app/admin/intake src/app/admin/patients src/app/admin/translations
git commit -m "feat(sp4): enforce requireModule on all disable-able admin routes"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full pure-test suite**

Run: `npx tsx tests/admin-nav.mjs && npx tsx tests/role-assignment.mjs && npx tsx tests/roles.mjs && npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs && npx tsx tests/system-helpers.mjs`
Expected: every line prints `… PASSED`.

- [ ] **Step 2: Lint + type-check the whole project**

Run: `npm run lint && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from any SP4-touched file (`rbac.ts`, `admin-nav.ts`, `admin/layout.tsx`, the wired routes). Pre-existing errors in untouched files (e.g. `CrisisBanner.tsx`, `consent.ts`) are out of scope — confirm none of the SP4 files appear.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; all `/admin/*` routes still compile.

- [ ] **Step 4: End-to-end manual smoke**

1. **Custom-role nav (live):** As Super Admin, assign a custom role with a *narrow* permission set (e.g. only `patients.view`) to a test user. Log in as that user → confirm the sidebar shows only Dashboard + Patients + Security, **without** re-login after the role was changed.
2. **Module-aware nav + super enforcement:** As Super Admin, disable the `patient_portal` module in `/admin/system`. Confirm the test user's Patients link disappears on their next request. As Super Admin, navigate directly to `/admin/patients` → confirm redirect to `/admin/unavailable?m=patient_portal` (proves `requireModule` blocks supers). Re-enable the module and confirm both restore.
3. **Built-in parity:** Log in as a built-in non-super (e.g. Compliance Officer) → confirm the nav matches what it showed before SP4 (no missing/extra links).

- [ ] **Step 5: Final commit (if any verification fixups)**

```bash
git add -A
git commit -m "chore(sp4): final verification fixups"
```

---

## Done-when (SP4 acceptance)

- [ ] `admin/layout.tsx` builds the nav from live DB permissions; a custom-role user's nav matches their permissions on the next request (no re-login).
- [ ] A built-in non-super role's nav is unchanged from pre-SP4 (parity).
- [ ] Capability-gated nav items hide when their backing module is disabled.
- [ ] Every `canDisable: true` module route (list + detail/sub-pages) calls `requireModule`; a Super Admin is redirected to `/admin/unavailable` when that module is off. `canDisable: false` routes are intentionally not wired.
- [ ] `buildAdminNav` is pure, exported, and unit-tested; `tests/admin-nav.mjs` passes; SP1/SP2/SP3 suites still green; lint + type-check clean for touched files; build succeeds.

## Known limitations (deferred)

- Role-gated nav items (Review moderation, Public form log, Locations) have no capability/permission key, so they do not auto-hide on module disable; their route guards still enforce access. Converting them to permission keys is future work.
- Granular `hasPermission('module.action')` call-site adoption is out of scope; `requireCapability` remains the guard.
- `/dashboard` (analytics) lives outside `/admin` and keeps its existing guards.
