# Multi-Tenancy — v2.3 Foundation & v4.0 Roadmap

The Medicaid Enrollment module (v2.3) is built tenant-aware from day one so Auxlia can
white-label and license it in v4.0 without a data-model rewrite.

## What exists now (v2.3 foundation)

- A `Tenant` model and a single seeded tenant (`slug = "fresh-start"`).
- `tenantId` on every enrollment model: `MedicaidEnrollmentCase`, `EnrollmentChecklistItem`,
  `EnrollmentDocument`, `McoEnrollment`, `EnrollmentAuditEntry`.
- A single tenant-scoped data layer (`src/lib/medicaid/cases.ts` + `documents.ts`) — every
  read and write filters/sets `tenantId` via `getActiveTenantId()`. No page queries the
  enrollment tables directly.

## What v4.0 must add on top

- **Tenant-aware auth/session:** resolve the tenant from the signed-in user (or subdomain),
  not a hard-coded slug; `getActiveTenantId()` becomes session/subdomain-driven.
- **Subdomain routing:** `auxlia.example.com` / `<client>.example.com` → tenant.
- **Per-tenant data isolation:** separate Neon branches (or row-level security) per tenant.
- **Per-tenant billing:** plan/usage metering and invoicing per tenant.
- **Tenant admin:** create/suspend tenants, invite tenant users, per-tenant RBAC.

Because all queries already pass `tenantId`, the above are additive — no migration of the
enrollment tables is required to support a second tenant.
