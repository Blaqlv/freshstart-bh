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
