# v3 Super Admin — SP1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every authorization check run against live, Super-Admin-editable module/role/permission state — with provably identical default behavior — plus seed data, the `isSuperAdmin` flag, secure setup, and docs. No control-panel UI (SP2) and no user-management changes (SP3).

**Architecture:** Hybrid roles (keep the `Role` enum as the 6 built-ins; seed matching `SystemRole` rows; add `User.customRoleKey` for runtime roles). Five new Prisma tables hold modules/roles/permissions. The existing `requireCapability()` entry point (111 call sites, unchanged) is re-implemented to resolve a DB-backed effective-permission set via a static capability→permission map. Role permissions are read **live per request** (memoized with React `cache()`); only role identity + the super-admin flag travel in the JWT cookie. No Redis, no edge middleware.

**Tech Stack:** Next.js 16 (App Router, server components/actions), Prisma 6 + Neon Postgres, `jose` JWT sessions, `tsx` for scripts/tests. Tests are standalone `tsx` scripts under `tests/` run with `npx tsx tests/<name>.mjs`, asserting via Node's `assert` and setting `process.exitCode` on failure (mirrors `tests/eligibility-config.mjs`). There is no Jest/Vitest — do not add one.

---

## Repo conventions (read before starting)

- **DB client:** `import { db } from "@/lib/db"` (singleton). Seeds use a local `PrismaClient` (see `prisma/seed.ts`).
- **Session:** `src/lib/auth.ts` — `Session` type, `signSession`/`verifySession` (jose), `getSession`, `requireSession`, `requireCapability`. `"server-only"` at top.
- **Capabilities:** `src/lib/rbac.ts` — `Capability` union, `roleCapabilities: Record<Role, Capability[]>`, `can()`. Static today.
- **Audit:** `audit(actor, action, entity, entityId?, metadata?)` from `src/lib/audit.ts`. Append-only.
- **Tests import `.ts` directly**, e.g. `import { x } from "../src/lib/roles.ts"`. Keep test logic **DB-free and pure** (the repo has no test DB harness). DB behavior is verified by running `npm run db:seed` manually.
- **Lint/build:** `npm run lint`, `npm run build`.

## File map

| File | Create/Modify | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | 5 new models + `User.isSuperAdmin`, `User.customRoleKey` |
| `prisma/seeds/modules.ts` | Create | `MODULES` array (26 entries, pure data) |
| `prisma/seeds/roles.ts` | Create | `ROLES` array (7 entries, pure data) |
| `prisma/seeds/permissions.ts` | Create | `PERMISSIONS` catalog (pure data) |
| `prisma/seeds/index.ts` | Create | `seedSystem(db)` — idempotent upserts + derived grants + module-role-access |
| `prisma/seed.ts` | Modify | Call `seedSystem(db)` from `main()` |
| `src/lib/roles.ts` | Create | `roleKeyFromEnum`, `effectiveRoleKey`, `ROLE_KEYS` |
| `src/lib/capability-map.ts` | Create | `CAPABILITY_PERMISSIONS`, `deriveRolePermissions` |
| `src/lib/permissions.ts` | Create | pure `resolveEffectivePermissions`; DB `getEffectivePermissions`, `hasPermission`, `moduleIsEnabled` |
| `src/lib/auth.ts` | Modify | `Session` + JWT fields; DB-backed `requireCapability`; `requireSuperAdmin`, `requireModule` |
| `src/app/admin/login/actions.ts` | Modify | Pass `isSuperAdmin` + `roleKey` into the session |
| `src/app/admin/unavailable/page.tsx` | Create | "Feature unavailable" page (shows module key) |
| `src/app/admin/medicaid-enrollment/page.tsx` | Modify | `requireModule("medicaid_enrollment")` |
| `src/app/admin/incidents/page.tsx` | Modify | `requireModule("incident_reporting")` |
| `scripts/create-super-admin.ts` | Create | Interactive first-run Super Admin setup |
| `README_SUPERADMIN.md` | Create | DB-only flag docs |
| `tests/roles.mjs` | Create | `roleKeyFromEnum`/`effectiveRoleKey` |
| `tests/seed-data.mjs` | Create | Catalog integrity (counts, unique keys, refs) |
| `tests/capability-map.mjs` | Create | **Regression:** derived grants → caps == `roleCapabilities` |
| `tests/permissions-resolve.mjs` | Create | `resolveEffectivePermissions` module/access gating |
| `tests/superadmin-script.mjs` | Create | `generateTempPassword` shape |

---

## Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (after the `Role` enum block, and inside `model User`)

- [ ] **Step 1: Add the five models to `prisma/schema.prisma`**

Append this block at the end of the file:

```prisma
// ---------------------------------------------------------------------------
// v3 Super Admin — module/role/permission registry (runtime-editable RBAC)
// ---------------------------------------------------------------------------
model SystemModule {
  id          String             @id @default(cuid())
  key         String             @unique
  label       String
  description String
  isEnabled   Boolean            @default(true)
  group       String
  canDisable  Boolean            @default(true)
  updatedAt   DateTime           @updatedAt
  updatedBy   String?
  roleAccess  ModuleRoleAccess[]
}

model ModuleRoleAccess {
  id        String       @id @default(cuid())
  moduleKey String
  roleKey   String
  canAccess Boolean      @default(true)
  module    SystemModule @relation(fields: [moduleKey], references: [key], onDelete: Cascade)
  role      SystemRole   @relation(fields: [roleKey], references: [key], onDelete: Cascade)

  @@unique([moduleKey, roleKey])
}

model SystemRole {
  id           String             @id @default(cuid())
  key          String             @unique
  label        String
  description  String
  isSystem     Boolean            @default(false)
  isActive     Boolean            @default(true)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  createdBy    String?
  permissions  RolePermission[]
  moduleAccess ModuleRoleAccess[]
}

model Permission {
  id              String           @id @default(cuid())
  key             String           @unique
  label           String
  description     String
  moduleKey       String
  rolePermissions RolePermission[]
}

model RolePermission {
  id            String     @id @default(cuid())
  roleKey       String
  permissionKey String
  granted       Boolean    @default(true)
  grantedAt     DateTime   @default(now())
  grantedBy     String?
  role          SystemRole @relation(fields: [roleKey], references: [key], onDelete: Cascade)
  permission    Permission @relation(fields: [permissionKey], references: [key], onDelete: Cascade)

  @@unique([roleKey, permissionKey])
}
```

- [ ] **Step 2: Add two fields to `model User`**

Inside `model User { ... }`, after the `mfaEnabled` line, add:

```prisma
  isSuperAdmin  Boolean   @default(false)
  customRoleKey String? // overrides enum-derived role key (hybrid dynamic roles)
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Create the migration**

Run: `npx prisma migrate dev --name v3_superadmin_registry`
Expected: a new folder `prisma/migrations/<timestamp>_v3_superadmin_registry/migration.sql` and `prisma generate` runs. (If no local DB is reachable, instead run `npx prisma migrate dev --name v3_superadmin_registry --create-only` to author the SQL, then `npx prisma generate`. Record in the commit message that `migrate deploy` is still required on real DBs — see the `v2-ehr-eligibility-medicaid` memory.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(v3): SystemModule/Role/Permission schema + User.isSuperAdmin"
```

---

## Task 2: Roles helper + capability map + seed catalog (pure data) + tests

**Files:**
- Create: `src/lib/roles.ts`, `src/lib/capability-map.ts`, `prisma/seeds/modules.ts`, `prisma/seeds/roles.ts`, `prisma/seeds/permissions.ts`
- Test: `tests/roles.mjs`, `tests/seed-data.mjs`, `tests/capability-map.mjs`

- [ ] **Step 1: Write `tests/roles.mjs` (failing)**

```js
// tests/roles.mjs
import assert from "node:assert";
import { roleKeyFromEnum, effectiveRoleKey, ROLE_KEYS } from "../src/lib/roles.ts";

assert.strictEqual(roleKeyFromEnum("ADMINISTRATOR"), "administrator");
assert.strictEqual(roleKeyFromEnum("BILLING_STAFF"), "billing_staff");
assert.strictEqual(effectiveRoleKey({ role: "PROVIDER", customRoleKey: null }), "provider");
assert.strictEqual(
  effectiveRoleKey({ role: "PROVIDER", customRoleKey: "intake_coordinator" }),
  "intake_coordinator",
);
assert.ok(ROLE_KEYS.includes("super_admin"));
assert.strictEqual(ROLE_KEYS.length, 7);
console.log("roles test PASSED");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx tests/roles.mjs`
Expected: FAIL — cannot find `../src/lib/roles.ts`.

- [ ] **Step 3: Create `src/lib/roles.ts`**

```ts
import type { Role } from "@prisma/client";

/** The 7 seeded SystemRole keys (super_admin + the 6 enum roles). */
export const ROLE_KEYS = [
  "super_admin",
  "administrator",
  "clinical_director",
  "compliance_officer",
  "receptionist",
  "provider",
  "billing_staff",
] as const;

/** Map the static Role enum to its SystemRole.key (lowercase). */
export function roleKeyFromEnum(role: Role): string {
  return role.toLowerCase();
}

/** A user's effective role key: a runtime customRoleKey overrides the enum. */
export function effectiveRoleKey(user: { role: Role; customRoleKey?: string | null }): string {
  return user.customRoleKey ?? roleKeyFromEnum(user.role);
}
```

- [ ] **Step 4: Run `tests/roles.mjs` — expect PASS**

Run: `npx tsx tests/roles.mjs`
Expected: `roles test PASSED`

- [ ] **Step 5: Create `src/lib/capability-map.ts`**

Each existing `Capability` maps to exactly ONE canonical permission key. Grants are derived from this map so the DB-backed bridge reproduces today's access exactly. `Capability` is a string-union **type** exported from `@/lib/rbac` (not a Prisma type); `keyof typeof roleCapabilities` resolves to the `Role` enum without importing it.

```ts
import type { Capability } from "@/lib/rbac";
import { roleCapabilities } from "@/lib/rbac";

/** Capability -> the permission key(s) that must ALL be granted for it. */
export const CAPABILITY_PERMISSIONS: Record<Capability, string[]> = {
  "content:read": ["cms.view_pages"],
  "content:write": ["cms.edit_pages"],
  "content:publish": ["cms.publish_pages"],
  "providers:write": ["providers.manage"],
  "testimonials:write": ["reviews.moderate"],
  "forms:manage": ["forms.manage"],
  "users:manage": ["users.manage"],
  "audit:read": ["audit_log.view"],
  "incidents:manage": ["incident_reporting.manage"],
  "dashboard:read": ["analytics.view"],
  "billing:manage": ["billing.manage"],
  "appointments:read": ["appointments.view_requests"],
  "patients:read": ["patients.view"],
  "patients:manage": ["patients.manage"],
  "enrollment:read": ["medicaid_enrollment.view"],
  "enrollment:manage": ["medicaid_enrollment.manage"],
};

/** Derive default permission grants for a role from its static capabilities. */
export function deriveRolePermissions(roleEnumKey: keyof typeof roleCapabilities): string[] {
  const caps = roleCapabilities[roleEnumKey] ?? [];
  const out = new Set<string>();
  for (const cap of caps) for (const p of CAPABILITY_PERMISSIONS[cap] ?? []) out.add(p);
  return [...out];
}

/** Given a granted-permission set, which capabilities does it satisfy? */
export function capabilitiesFromPermissions(granted: Set<string>): Capability[] {
  return (Object.keys(CAPABILITY_PERMISSIONS) as Capability[]).filter((cap) =>
    CAPABILITY_PERMISSIONS[cap].every((p) => granted.has(p)),
  );
}
```

`deriveRolePermissions` takes a `Role` enum value (e.g. `"ADMINISTRATOR"`); `keyof typeof roleCapabilities` is `Role`.

- [ ] **Step 6: Create `prisma/seeds/modules.ts`**

```ts
export type ModuleSeed = {
  key: string;
  label: string;
  description: string;
  group: "public_site" | "portals" | "admin" | "compliance" | "integrations";
  canDisable: boolean;
};

export const MODULES: ModuleSeed[] = [
  { key: "cms", label: "Content Management System", description: "Page authoring, blocks, media.", group: "admin", canDisable: false },
  { key: "public_site", label: "Public Marketing Site", description: "Public-facing website.", group: "public_site", canDisable: false },
  { key: "patient_portal", label: "Patient Portal", description: "Patient-facing portal.", group: "portals", canDisable: true },
  { key: "intake_portal", label: "New Patient Intake Portal", description: "Patient intake flow.", group: "portals", canDisable: true },
  { key: "appointment_requests", label: "Appointment Request Forms", description: "Public/staff appointment requests & forms.", group: "portals", canDisable: true },
  { key: "insurance_verification", label: "Insurance Verification (Manual)", description: "Manual insurance checks.", group: "portals", canDisable: true },
  { key: "insurance_verification_auto", label: "Automated Insurance Eligibility", description: "Automated eligibility checks.", group: "integrations", canDisable: true },
  { key: "secure_messaging", label: "Secure Messaging (Patient ↔ Staff)", description: "Encrypted messaging.", group: "portals", canDisable: true },
  { key: "document_upload", label: "Secure Document Upload", description: "Patient document upload.", group: "portals", canDisable: true },
  { key: "billing_statements", label: "Billing Statements", description: "Patient billing statements.", group: "portals", canDisable: true },
  { key: "provider_profiles", label: "Provider / Staff Profiles", description: "Public provider profiles.", group: "public_site", canDisable: true },
  { key: "blog_resources", label: "Blog & Resources", description: "Blog and resource articles.", group: "public_site", canDisable: true },
  { key: "careers", label: "Careers Module", description: "Careers/jobs.", group: "public_site", canDisable: true },
  { key: "reviews_moderation", label: "Review / Testimonial Moderation", description: "Moderate reviews & testimonials.", group: "admin", canDisable: true },
  { key: "audit_log", label: "Audit Log", description: "Immutable audit trail.", group: "admin", canDisable: false },
  { key: "user_management", label: "User & Role Management", description: "Manage users and roles.", group: "admin", canDisable: false },
  { key: "incident_reporting", label: "Incident Reporting", description: "Compliance incidents.", group: "compliance", canDisable: true },
  { key: "analytics_dashboard", label: "Analytics Dashboard", description: "Admin analytics.", group: "admin", canDisable: true },
  { key: "ehr_integration", label: "EHR Integration (FHIR)", description: "Read-only FHIR integration.", group: "integrations", canDisable: true },
  { key: "sms_notifications", label: "SMS Notifications (Telnyx)", description: "Outbound SMS.", group: "integrations", canDisable: true },
  { key: "medicaid_enrollment", label: "Medicaid Enrollment Module", description: "Medicaid enrollment cases.", group: "compliance", canDisable: true },
  { key: "cookie_consent", label: "Cookie Consent Manager", description: "Consent banner.", group: "public_site", canDisable: false },
  { key: "multilingual", label: "Multi-Language (Spanish)", description: "Spanish translations.", group: "public_site", canDisable: true },
  { key: "gbp_sync", label: "Google Business Profile Sync", description: "GBP sync.", group: "integrations", canDisable: true },
  { key: "statuspage", label: "Status Page Integration", description: "Status page.", group: "admin", canDisable: true },
  { key: "system_control", label: "System Control Panel", description: "Super Admin control panel.", group: "admin", canDisable: false },
];
```

- [ ] **Step 7: Create `prisma/seeds/roles.ts`**

```ts
export type RoleSeed = {
  key: string;
  label: string;
  description: string;
  isSystem: boolean;
};

export const ROLES: RoleSeed[] = [
  { key: "super_admin", label: "Super Admin", description: "Highest privilege; bypasses all checks.", isSystem: true },
  { key: "administrator", label: "Administrator", description: "Full administrative access.", isSystem: true },
  { key: "clinical_director", label: "Clinical Director", description: "Clinical oversight.", isSystem: false },
  { key: "compliance_officer", label: "Compliance Officer", description: "Audit & compliance.", isSystem: false },
  { key: "receptionist", label: "Receptionist", description: "Front-desk operations.", isSystem: false },
  { key: "provider", label: "Provider", description: "Clinical provider.", isSystem: false },
  { key: "billing_staff", label: "Billing Staff", description: "Billing operations.", isSystem: false },
];
```

- [ ] **Step 8: Create `prisma/seeds/permissions.ts`**

```ts
export type PermissionSeed = { key: string; label: string; description: string; moduleKey: string };

export const PERMISSIONS: PermissionSeed[] = [
  // appointment_requests
  { key: "appointments.view_requests", label: "View appointment requests", description: "", moduleKey: "appointment_requests" },
  { key: "appointments.manage_requests", label: "Manage appointment requests", description: "", moduleKey: "appointment_requests" },
  { key: "appointments.manage_slots", label: "Manage appointment slots", description: "", moduleKey: "appointment_requests" },
  { key: "forms.manage", label: "Manage forms", description: "", moduleKey: "appointment_requests" },
  // patient_portal
  { key: "patient_portal.view_messages", label: "View messages", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.send_messages", label: "Send messages", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.view_documents", label: "View documents", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.manage_documents", label: "Manage documents", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.view_billing", label: "View billing", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.manage_billing", label: "Manage billing", description: "", moduleKey: "patient_portal" },
  { key: "patients.view", label: "View patient records", description: "", moduleKey: "patient_portal" },
  { key: "patients.manage", label: "Manage patient records", description: "", moduleKey: "patient_portal" },
  // cms
  { key: "cms.view_pages", label: "View pages", description: "", moduleKey: "cms" },
  { key: "cms.edit_pages", label: "Edit pages", description: "", moduleKey: "cms" },
  { key: "cms.publish_pages", label: "Publish pages", description: "", moduleKey: "cms" },
  { key: "cms.delete_pages", label: "Delete pages", description: "", moduleKey: "cms" },
  { key: "cms.manage_media", label: "Manage media", description: "", moduleKey: "cms" },
  // provider_profiles
  { key: "providers.manage", label: "Manage provider profiles", description: "", moduleKey: "provider_profiles" },
  // reviews_moderation
  { key: "reviews.moderate", label: "Moderate reviews/testimonials", description: "", moduleKey: "reviews_moderation" },
  // analytics_dashboard
  { key: "analytics.view", label: "View analytics dashboard", description: "", moduleKey: "analytics_dashboard" },
  // billing_statements
  { key: "billing.manage", label: "Manage billing statements", description: "", moduleKey: "billing_statements" },
  // user_management
  { key: "users.view", label: "View users", description: "", moduleKey: "user_management" },
  { key: "users.create", label: "Create users", description: "", moduleKey: "user_management" },
  { key: "users.edit", label: "Edit users", description: "", moduleKey: "user_management" },
  { key: "users.deactivate", label: "Deactivate users", description: "", moduleKey: "user_management" },
  { key: "users.manage", label: "Full user management", description: "", moduleKey: "user_management" },
  { key: "roles.view", label: "View roles", description: "", moduleKey: "user_management" },
  { key: "roles.edit", label: "Edit roles", description: "", moduleKey: "user_management" },
  // audit_log
  { key: "audit_log.view", label: "View audit log", description: "", moduleKey: "audit_log" },
  // incident_reporting
  { key: "incident_reporting.view", label: "View incidents", description: "", moduleKey: "incident_reporting" },
  { key: "incident_reporting.create", label: "Create incidents", description: "", moduleKey: "incident_reporting" },
  { key: "incident_reporting.manage", label: "Manage incidents", description: "", moduleKey: "incident_reporting" },
  // ehr_integration
  { key: "ehr.view_patient_data", label: "View EHR patient data", description: "", moduleKey: "ehr_integration" },
  { key: "ehr.link_patients", label: "Link EHR patients", description: "", moduleKey: "ehr_integration" },
  // medicaid_enrollment
  { key: "medicaid_enrollment.view", label: "View enrollments", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.create", label: "Create enrollments", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.manage", label: "Manage enrollments", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.view_documents", label: "View enrollment documents", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.upload_documents", label: "Upload enrollment documents", description: "", moduleKey: "medicaid_enrollment" },
  // insurance_verification_auto
  { key: "insurance_verification_auto.use", label: "Run automated eligibility", description: "", moduleKey: "insurance_verification_auto" },
  // system_control
  { key: "system.manage_modules", label: "Manage modules", description: "", moduleKey: "system_control" },
  { key: "system.manage_roles", label: "Manage roles", description: "", moduleKey: "system_control" },
  { key: "system.manage_permissions", label: "Manage permissions", description: "", moduleKey: "system_control" },
  { key: "system.view_system_config", label: "View system config", description: "", moduleKey: "system_control" },
];
```

- [ ] **Step 9: Write `tests/seed-data.mjs` (catalog integrity)**

```js
// tests/seed-data.mjs
import assert from "node:assert";
import { MODULES } from "../prisma/seeds/modules.ts";
import { ROLES } from "../prisma/seeds/roles.ts";
import { PERMISSIONS } from "../prisma/seeds/permissions.ts";
import { CAPABILITY_PERMISSIONS } from "../src/lib/capability-map.ts";

const moduleKeys = new Set(MODULES.map((m) => m.key));
const permKeys = new Set(PERMISSIONS.map((p) => p.key));

assert.strictEqual(MODULES.length, 26, "26 modules");
assert.strictEqual(moduleKeys.size, 26, "module keys unique");
assert.strictEqual(ROLES.length, 7, "7 roles");
assert.strictEqual(new Set(ROLES.map((r) => r.key)).size, 7, "role keys unique");
assert.strictEqual(permKeys.size, PERMISSIONS.length, "permission keys unique");

// Core modules cannot be disabled.
for (const k of ["cms", "public_site", "audit_log", "user_management", "cookie_consent", "system_control"]) {
  assert.strictEqual(MODULES.find((m) => m.key === k)?.canDisable, false, `${k} canDisable=false`);
}
// Every permission belongs to a real module.
for (const p of PERMISSIONS) assert.ok(moduleKeys.has(p.moduleKey), `module ${p.moduleKey} exists for ${p.key}`);
// Every capability maps to permissions that exist in the catalog.
for (const caps of Object.values(CAPABILITY_PERMISSIONS))
  for (const pk of caps) assert.ok(permKeys.has(pk), `mapped permission ${pk} in catalog`);

console.log("seed-data test PASSED");
```

- [ ] **Step 10: Run `tests/seed-data.mjs` — expect PASS**

Run: `npx tsx tests/seed-data.mjs`
Expected: `seed-data test PASSED`

- [ ] **Step 11: Write `tests/capability-map.mjs` — THE regression test**

```js
// tests/capability-map.mjs
import assert from "node:assert";
import { roleCapabilities } from "../src/lib/rbac.ts";
import { deriveRolePermissions, capabilitiesFromPermissions } from "../src/lib/capability-map.ts";

// For every enum role, the capabilities recovered from its DERIVED default
// grants must EXACTLY equal today's static roleCapabilities (sorted compare).
for (const role of Object.keys(roleCapabilities)) {
  const granted = new Set(deriveRolePermissions(role));
  const recovered = capabilitiesFromPermissions(granted).sort();
  const expected = [...roleCapabilities[role]].sort();
  assert.deepStrictEqual(recovered, expected, `caps preserved for ${role}`);
}
console.log("capability-map regression test PASSED");
```

- [ ] **Step 12: Run it — expect PASS**

Run: `npx tsx tests/capability-map.mjs`
Expected: `capability-map regression test PASSED`. If it FAILS, the `CAPABILITY_PERMISSIONS` map is wrong — fix the map until each role's recovered capabilities equal `roleCapabilities[role]` (do NOT edit `rbac.ts`).

- [ ] **Step 13: Commit**

```bash
git add src/lib/roles.ts src/lib/capability-map.ts prisma/seeds/modules.ts prisma/seeds/roles.ts prisma/seeds/permissions.ts tests/roles.mjs tests/seed-data.mjs tests/capability-map.mjs
git commit -m "feat(v3): seed catalog + capability->permission map with parity regression test"
```

---

## Task 3: `seedSystem` upserts + wire into `prisma/seed.ts`

**Files:**
- Create: `prisma/seeds/index.ts`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Create `prisma/seeds/index.ts`**

Idempotent: upserts refresh descriptive fields but NEVER reset `isEnabled`, `RolePermission.granted`, or `ModuleRoleAccess.canAccess` on existing rows (so re-seeding can't undo a Super Admin's edits).

```ts
import type { PrismaClient } from "@prisma/client";
import { MODULES } from "./modules";
import { ROLES } from "./roles";
import { PERMISSIONS } from "./permissions";
import { deriveRolePermissions } from "../../src/lib/capability-map";
import { roleCapabilities } from "../../src/lib/rbac";

const NON_SUPER_ROLES = ["administrator", "clinical_director", "compliance_officer", "receptionist", "provider", "billing_staff"] as const;
const ROLE_ENUM_BY_KEY: Record<string, keyof typeof roleCapabilities> = {
  administrator: "ADMINISTRATOR",
  clinical_director: "CLINICAL_DIRECTOR",
  compliance_officer: "COMPLIANCE_OFFICER",
  receptionist: "RECEPTIONIST",
  provider: "PROVIDER",
  billing_staff: "BILLING_STAFF",
};

export async function seedSystem(db: PrismaClient): Promise<void> {
  // Modules — refresh metadata, preserve isEnabled.
  for (const m of MODULES) {
    await db.systemModule.upsert({
      where: { key: m.key },
      update: { label: m.label, description: m.description, group: m.group, canDisable: m.canDisable },
      create: { key: m.key, label: m.label, description: m.description, group: m.group, canDisable: m.canDisable },
    });
  }
  // Roles.
  for (const r of ROLES) {
    await db.systemRole.upsert({
      where: { key: r.key },
      update: { label: r.label, description: r.description, isSystem: r.isSystem },
      create: { key: r.key, label: r.label, description: r.description, isSystem: r.isSystem },
    });
  }
  // Permissions.
  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, description: p.description, moduleKey: p.moduleKey },
      create: { key: p.key, label: p.label, description: p.description, moduleKey: p.moduleKey },
    });
  }
  // Module-role access: default canAccess=true for every (module x non-super role).
  // Create only if missing — never reset an admin's restriction.
  for (const m of MODULES) {
    for (const roleKey of NON_SUPER_ROLES) {
      const existing = await db.moduleRoleAccess.findUnique({
        where: { moduleKey_roleKey: { moduleKey: m.key, roleKey } },
      });
      if (!existing) {
        await db.moduleRoleAccess.create({ data: { moduleKey: m.key, roleKey, canAccess: true } });
      }
    }
  }
  // Role permissions: DERIVED from capabilities so live access == static defaults.
  // Create only if missing — never reset a grant the Super Admin changed.
  for (const roleKey of NON_SUPER_ROLES) {
    const grants = deriveRolePermissions(ROLE_ENUM_BY_KEY[roleKey]);
    for (const permissionKey of grants) {
      const existing = await db.rolePermission.findUnique({
        where: { roleKey_permissionKey: { roleKey, permissionKey } },
      });
      if (!existing) {
        await db.rolePermission.create({ data: { roleKey, permissionKey, granted: true } });
      }
    }
  }
  // super_admin intentionally gets NO RolePermission rows (bypasses via flag).
}
```

- [ ] **Step 2: Wire `seedSystem` into `prisma/seed.ts`**

In `prisma/seed.ts`, add this import near the other seed imports (top of file):

```ts
import { seedSystem } from "./seeds";
```

Then inside `async function main() { ... }`, before the closing of `main` (after the existing seeding, e.g. right before the insurance payer block at line ~329 or at the end of the body), add:

```ts
  // v3 Super Admin — module/role/permission registry.
  await seedSystem(db);
```

- [ ] **Step 3: Type-check the seed**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `prisma/seeds` or `prisma/seed.ts`. (Pre-existing unrelated errors, if any, are out of scope — note them but don't fix here.)

- [ ] **Step 4: Run the seed against a DB (manual idempotency check)**

Run: `npm run db:seed` then run it a SECOND time: `npm run db:seed`
Expected: both complete without error; the second run does not throw on unique constraints (upsert/find-then-create). If no DB is available in this environment, record that this step must be run during deploy and continue. (See `v2-ehr-eligibility-medicaid` memory: `migrate deploy` + `db:seed` are required on real DBs.)

- [ ] **Step 5: Commit**

```bash
git add prisma/seeds/index.ts prisma/seed.ts
git commit -m "feat(v3): seedSystem upserts (modules/roles/permissions/access) wired into seed"
```

---

## Task 4: Permission engine (`src/lib/permissions.ts`)

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `tests/permissions-resolve.mjs`

- [ ] **Step 1: Write `tests/permissions-resolve.mjs` (failing)**

```js
// tests/permissions-resolve.mjs
import assert from "node:assert";
import { resolveEffectivePermissions } from "../src/lib/permissions.ts";

const permModule = [
  { key: "cms.edit_pages", moduleKey: "cms" },
  { key: "medicaid_enrollment.manage", moduleKey: "medicaid_enrollment" },
];

// Baseline: everything enabled and accessible -> grants pass through.
let out = resolveEffectivePermissions({
  grants: ["cms.edit_pages", "medicaid_enrollment.manage"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }, { key: "medicaid_enrollment", isEnabled: true }],
  access: [{ moduleKey: "cms", canAccess: true }, { moduleKey: "medicaid_enrollment", canAccess: true }],
});
assert.deepStrictEqual([...out].sort(), ["cms.edit_pages", "medicaid_enrollment.manage"]);

// Disabling a module removes its permissions.
out = resolveEffectivePermissions({
  grants: ["cms.edit_pages", "medicaid_enrollment.manage"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }, { key: "medicaid_enrollment", isEnabled: false }],
  access: [{ moduleKey: "cms", canAccess: true }, { moduleKey: "medicaid_enrollment", canAccess: true }],
});
assert.deepStrictEqual([...out], ["cms.edit_pages"]);

// Revoking module access removes its permissions.
out = resolveEffectivePermissions({
  grants: ["cms.edit_pages"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }],
  access: [{ moduleKey: "cms", canAccess: false }],
});
assert.deepStrictEqual([...out], []);

console.log("permissions-resolve test PASSED");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx tests/permissions-resolve.mjs`
Expected: FAIL — cannot find `resolveEffectivePermissions`.

- [ ] **Step 3: Create `src/lib/permissions.ts`**

```ts
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

type PermModule = { key: string; moduleKey: string };
type ModuleFlag = { key: string; isEnabled: boolean };
type AccessFlag = { moduleKey: string; canAccess: boolean };

/** Pure: filter granted permissions by enabled modules and module access. */
export function resolveEffectivePermissions(input: {
  grants: string[];
  permModule: PermModule[];
  modules: ModuleFlag[];
  access: AccessFlag[];
}): Set<string> {
  const enabled = new Set(input.modules.filter((m) => m.isEnabled).map((m) => m.key));
  const accessible = new Set(input.access.filter((a) => a.canAccess).map((a) => a.moduleKey));
  const moduleOf = new Map(input.permModule.map((p) => [p.key, p.moduleKey]));
  const out = new Set<string>();
  for (const g of input.grants) {
    const mk = moduleOf.get(g);
    if (!mk) continue;
    if (!enabled.has(mk)) continue;
    if (!accessible.has(mk)) continue;
    out.add(g);
  }
  return out;
}

/** DB-backed, memoized once per request (React cache). */
export const getEffectivePermissions = cache(async (roleKey: string): Promise<Set<string>> => {
  const [grants, modules, access, permModule] = await Promise.all([
    db.rolePermission.findMany({ where: { roleKey, granted: true }, select: { permissionKey: true } }),
    db.systemModule.findMany({ select: { key: true, isEnabled: true } }),
    db.moduleRoleAccess.findMany({ where: { roleKey }, select: { moduleKey: true, canAccess: true } }),
    db.permission.findMany({ select: { key: true, moduleKey: true } }),
  ]);
  return resolveEffectivePermissions({
    grants: grants.map((g) => g.permissionKey),
    permModule,
    modules,
    access,
  });
});

/** Is a single module globally enabled? Memoized per request. */
export const moduleIsEnabled = cache(async (moduleKey: string): Promise<boolean> => {
  const m = await db.systemModule.findUnique({ where: { key: moduleKey }, select: { isEnabled: true } });
  return m?.isEnabled ?? false;
});

/** Does this session hold a specific granular permission? */
export async function hasPermission(
  session: { isSuperAdmin?: boolean; roleKey: string },
  permissionKey: string,
): Promise<boolean> {
  if (session.isSuperAdmin) return true;
  const perms = await getEffectivePermissions(session.roleKey);
  return perms.has(permissionKey);
}
```

- [ ] **Step 4: Run `tests/permissions-resolve.mjs` — expect PASS**

Run: `npx tsx tests/permissions-resolve.mjs`
Expected: `permissions-resolve test PASSED`

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts tests/permissions-resolve.mjs
git commit -m "feat(v3): DB-backed permission engine with per-request cache"
```

---

## Task 5: Capability bridge + session fields + login

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/admin/login/actions.ts`

- [ ] **Step 1: Extend the `Session` type in `src/lib/auth.ts`**

Replace the `Session` type (lines ~16-21) with:

```ts
export type Session = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  roleKey: string;
  isSuperAdmin: boolean;
};
```

- [ ] **Step 2: Put the new fields into the JWT in `signSession`**

Replace the `SignJWT({...})` payload (line ~30) with:

```ts
  return new SignJWT({
    email: session.email,
    name: session.name,
    role: session.role,
    roleKey: session.roleKey,
    isSuperAdmin: session.isSuperAdmin,
  })
```

- [ ] **Step 3: Read the new fields (back-compat) in `verifySession`**

Replace the `return {...}` block in `verifySession` (lines ~40-46) with:

```ts
    const role = payload.role as Role;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role,
      roleKey: typeof payload.roleKey === "string" ? payload.roleKey : role.toLowerCase(),
      isSuperAdmin: payload.isSuperAdmin === true,
    };
```

- [ ] **Step 4: Re-implement `requireCapability` (DB-backed) and add guards**

Add imports at the top of `src/lib/auth.ts` (after the existing imports):

```ts
import { redirect } from "next/navigation";
import { getEffectivePermissions, moduleIsEnabled } from "@/lib/permissions";
import { CAPABILITY_PERMISSIONS } from "@/lib/capability-map";
```

Replace the existing `requireCapability` function (lines ~81-85) with:

```ts
/** Throws if the session lacks the capability (DB-backed, live per request). */
export async function requireCapability(capability: Capability): Promise<Session> {
  const s = await requireSession();
  if (s.isSuperAdmin) return s;
  const required = CAPABILITY_PERMISSIONS[capability] ?? [];
  if (required.length === 0) throw new Error("FORBIDDEN");
  const perms = await getEffectivePermissions(s.roleKey);
  if (!required.every((p) => perms.has(p))) throw new Error("FORBIDDEN");
  return s;
}

/** Redirects non-Super-Admins away from Super-Admin-only routes. */
export async function requireSuperAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s || !s.isSuperAdmin) redirect("/admin/unavailable");
  return s;
}

/** Redirects to /admin/unavailable when a module is globally disabled. */
export async function requireModule(moduleKey: string): Promise<void> {
  if (!(await moduleIsEnabled(moduleKey))) {
    redirect(`/admin/unavailable?m=${encodeURIComponent(moduleKey)}`);
  }
}
```

Note: `requireCapability` keeps the exact same signature and import path (`@/lib/auth`), so none of the 111 existing call sites change. `permissions.ts` imports only the `type Session` indirectly (via duck-typed param), so there is no runtime import cycle.

- [ ] **Step 5: Update the login action to populate the session**

In `src/app/admin/login/actions.ts`, add the import (after line 6):

```ts
import { effectiveRoleKey } from "@/lib/roles";
```

Replace line 36 (`await createSessionCookie({ sub: user.id, ... })`) with:

```ts
  await createSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleKey: effectiveRoleKey(user),
    isSuperAdmin: user.isSuperAdmin,
  });
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors. (Confirm `Session`'s new required fields are satisfied everywhere `createSessionCookie`/`signSession` are called — only `login/actions.ts`.)

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: no errors in `auth.ts`, `permissions.ts`, `login/actions.ts`.

- [ ] **Step 8: Re-run the regression + resolve tests (guard against drift)**

Run: `npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs`
Expected: both PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth.ts src/app/admin/login/actions.ts
git commit -m "feat(v3): DB-backed requireCapability bridge + session isSuperAdmin/roleKey"
```

---

## Task 6: `/admin/unavailable` page + `requireModule` wiring

**Files:**
- Create: `src/app/admin/unavailable/page.tsx`
- Modify: `src/app/admin/medicaid-enrollment/page.tsx`, `src/app/admin/incidents/page.tsx`

- [ ] **Step 1: Create `src/app/admin/unavailable/page.tsx`**

```tsx
import { getSession } from "@/lib/auth";

export default async function UnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const session = await getSession();
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">This feature is currently unavailable</h1>
      <p className="mt-3 text-gray-600">
        Contact your system administrator if you believe you should have access.
      </p>
      {session?.isSuperAdmin && m ? (
        <p className="mt-4 rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-700">
          Disabled module: <strong>{m}</strong>
        </p>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 2: Read the two target pages to find the guard line**

Run: `grep -n "requireCapability\|requireSession" src/app/admin/medicaid-enrollment/page.tsx src/app/admin/incidents/page.tsx`
Expected: each file calls `requireCapability(...)` near the top of its default export.

- [ ] **Step 3: Add `requireModule` to the medicaid page**

In `src/app/admin/medicaid-enrollment/page.tsx`, ensure `requireModule` is imported from `@/lib/auth` (add to the existing `@/lib/auth` import), and add this line immediately BEFORE the existing `requireCapability(...)` call in the component body:

```ts
  await requireModule("medicaid_enrollment");
```

- [ ] **Step 4: Add `requireModule` to the incidents page**

In `src/app/admin/incidents/page.tsx`, import `requireModule` from `@/lib/auth` and add immediately before the existing `requireCapability(...)` call:

```ts
  await requireModule("incident_reporting");
```

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no new errors.

- [ ] **Step 6: Build (server components compile)**

Run: `npm run build`
Expected: build succeeds. (If the build needs env/DB it doesn't have in this environment, at minimum confirm the new/edited routes type-check; note any pre-existing build constraints.)

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/unavailable/page.tsx src/app/admin/medicaid-enrollment/page.tsx src/app/admin/incidents/page.tsx
git commit -m "feat(v3): /admin/unavailable page + requireModule guards on medicaid/incidents"
```

---

## Task 7: Super Admin setup script

**Files:**
- Create: `scripts/create-super-admin.ts`
- Test: `tests/superadmin-script.mjs`

- [ ] **Step 1: Write `tests/superadmin-script.mjs` (failing)**

```js
// tests/superadmin-script.mjs
import assert from "node:assert";
import { generateTempPassword } from "../scripts/create-super-admin.ts";

const a = generateTempPassword();
const b = generateTempPassword();
assert.ok(a.length >= 20, "temp password is long");
assert.notStrictEqual(a, b, "temp passwords are random");
console.log("superadmin-script test PASSED");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx tests/superadmin-script.mjs`
Expected: FAIL — cannot find `generateTempPassword`.

- [ ] **Step 3: Create `scripts/create-super-admin.ts`**

```ts
// Run ONCE on a fresh deployment: npx tsx scripts/create-super-admin.ts
// Grants Super Admin to an existing user, or creates one with a random temp
// password. The isSuperAdmin flag can ONLY be set here or via direct DB update.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function generateTempPassword(): string {
  // 30 url-safe chars from 24 random bytes.
  return crypto.randomBytes(24).toString("base64url");
}

async function main() {
  const db = new PrismaClient();
  const rl = createInterface({ input, output });
  try {
    const existingSupers = await db.user.count({ where: { isSuperAdmin: true } });
    if (existingSupers >= 2) {
      console.warn(`WARNING: ${existingSupers} Super Admins already exist. No more than 2 are recommended.`);
      const proceed = (await rl.question("Proceed anyway? (yes/no) ")).trim().toLowerCase();
      if (proceed !== "yes") {
        console.log("Aborted.");
        return;
      }
    }

    const email = (await rl.question("Super Admin email: ")).trim().toLowerCase();
    if (!email || !email.includes("@")) {
      console.error("Invalid email. Aborted.");
      process.exitCode = 1;
      return;
    }

    let user = await db.user.findUnique({ where: { email } });
    let tempPassword: string | null = null;

    if (user) {
      user = await db.user.update({ where: { id: user.id }, data: { isSuperAdmin: true, active: true } });
      console.log(`Granted Super Admin to existing user ${email}.`);
    } else {
      const name = (await rl.question("Full name (new user): ")).trim() || email;
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await db.user.create({
        data: { email, name, passwordHash, role: "ADMINISTRATOR", isSuperAdmin: true, active: true },
      });
      console.log(`Created Super Admin ${email}.`);
      console.log(`TEMP PASSWORD (change immediately): ${tempPassword}`);
    }

    await db.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "system.superadmin.create",
        entity: "User",
        entityId: user.id,
        metadata: { viaScript: true, createdNewUser: tempPassword !== null },
      },
    });
    console.log("Audit entry written. Done.");
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

// Only run main() when executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("create-super-admin.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run `tests/superadmin-script.mjs` — expect PASS**

Run: `npx tsx tests/superadmin-script.mjs`
Expected: `superadmin-script test PASSED` (the direct-run guard prevents `main()` from firing during import).

- [ ] **Step 5: Commit**

```bash
git add scripts/create-super-admin.ts tests/superadmin-script.mjs
git commit -m "feat(v3): create-super-admin setup script (DB-only flag)"
```

---

## Task 8: Docs + final verification

**Files:**
- Create: `README_SUPERADMIN.md`

- [ ] **Step 1: Create `README_SUPERADMIN.md`**

```markdown
# Super Admin

The Super Admin is the highest privilege tier. A user with `User.isSuperAdmin = true`
bypasses all module, role, and permission checks.

## Setting the flag (database only)

`isSuperAdmin` is **never** settable from the UI. Set it one of two ways:

1. **Setup script (recommended):**
   ```
   npx tsx scripts/create-super-admin.ts
   ```
   Prompts for an email. Grants Super Admin to an existing user, or creates a new
   user with a random temporary password (printed once — change it immediately).
   Writes a `system.superadmin.create` audit entry.

2. **Direct DB update:**
   ```sql
   UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'person@example.com';
   ```

## Rules

- No more than **2** Super Admin accounts should exist at any time.
- To revoke: `UPDATE "User" SET "isSuperAdmin" = false WHERE email = '...';`
- Super Admin actions are recorded in the audit log under `system.*` actions and are
  not editable by Administrators.
- Administrators cannot grant or remove Super Admin status.

## How enforcement works

`requireCapability()` and `hasPermission()` short-circuit to allow when
`session.isSuperAdmin` is true. The flag travels in the signed session cookie, so it
takes effect on next login after a DB change.
```

- [ ] **Step 2: Run the full test suite**

Run: `npx tsx tests/roles.mjs && npx tsx tests/seed-data.mjs && npx tsx tests/capability-map.mjs && npx tsx tests/permissions-resolve.mjs && npx tsx tests/superadmin-script.mjs`
Expected: five `... PASSED` lines, no failures.

- [ ] **Step 3: Lint + type-check the whole project**

Run: `npm run lint && npx tsc --noEmit -p tsconfig.json`
Expected: no new errors introduced by this work.

- [ ] **Step 4: Commit**

```bash
git add README_SUPERADMIN.md
git commit -m "docs(v3): README_SUPERADMIN — database-only Super Admin flag"
```

---

## Done-when (SP1 acceptance)

- [ ] `SystemModule`, `ModuleRoleAccess`, `SystemRole`, `Permission`, `RolePermission` migrated; `User.isSuperAdmin` + `customRoleKey` added.
- [ ] 26 modules seeded with correct `canDisable`; 7 roles; full permission catalog; `super_admin` has no `RolePermission` rows.
- [ ] `requireCapability()` is DB-backed at all 111 existing call sites with **zero call-site edits**; the regression test proves the 6 roles' access is unchanged.
- [ ] Permission/module state is read live per request and memoized with `cache()`; no Redis added.
- [ ] `requireSuperAdmin()` redirects non-supers to `/admin/unavailable`; `requireModule()` redirects when a module is disabled (wired on medicaid + incidents).
- [ ] Setup script exists; `README_SUPERADMIN.md` documents the database-only flag; no UI path sets `isSuperAdmin`.
- [ ] All five `tests/*.mjs` pass; lint + type-check clean.

## Deferred (NOT this plan)

- SP2: `/admin/system` control panel UI (module/role-access/role-mgmt/permission-editor/audit tabs), confirm/undo toggles, slide-overs.
- SP3: user-management role dropdown sourced from `SystemRole`, role-change email notifications, forced re-auth on role change, wiring `requireModule` into the remaining module routes.
- Adopting granular `hasPermission('module.action')` keys at call sites (incremental).
- DB-level audit immutability and any `AuditLog` schema change.
```
