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
