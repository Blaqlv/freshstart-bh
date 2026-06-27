import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { roleLabels } from "@/lib/rbac";
import { Sidebar, type NavItem } from "@/components/admin/Sidebar";
import { StatusPill } from "@/components/StatusPill";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Unauthenticated: the login page renders its own full-screen UI.
  if (!session) return <>{children}</>;

  const nav: NavItem[] = [{ label: "Dashboard", href: "/admin" }];
  if (can(session.role, "content:read")) {
    nav.push(
      { label: "Pages", href: "/admin/pages" },
      { label: "Providers", href: "/admin/providers" },
      { label: "Testimonials", href: "/admin/testimonials" },
    );
  }
  if (can(session.role, "appointments:read") || can(session.role, "billing:manage")) {
    nav.push({ label: "Form submissions", href: "/admin/submissions" });
  }
  if (can(session.role, "appointments:read")) nav.push({ label: "Patient intakes", href: "/admin/intake" });
  if (can(session.role, "forms:manage")) nav.push({ label: "Form management", href: "/admin/forms" });
  if (can(session.role, "incidents:manage")) nav.push({ label: "Incidents", href: "/admin/incidents" });
  if (["ADMINISTRATOR", "COMPLIANCE_OFFICER", "RECEPTIONIST"].includes(session.role)) {
    nav.push({ label: "Public form log", href: "/admin/public-submissions" });
  }
  if (can(session.role, "content:publish")) nav.push({ label: "Translations", href: "/admin/translations" });
  if (can(session.role, "users:manage")) nav.push({ label: "Users", href: "/admin/users" });
  if (can(session.role, "dashboard:read")) nav.push({ label: "Analytics dashboard", href: "/dashboard" });
  if (can(session.role, "audit:read")) nav.push({ label: "Audit log", href: "/admin/audit" });
  // Security (own MFA enrollment) is available to every signed-in staff member.
  nav.push({ label: "Security", href: "/admin/security" });

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-alt lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-line bg-white p-4 lg:min-h-screen">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-dark text-white text-sm font-bold">
            FS
          </span>
          <span className="font-bold text-brand-dark">Admin</span>
        </div>
        <Sidebar items={nav} />
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">{session.name}</p>
          <p className="text-xs text-ink-soft">{roleLabels[session.role]}</p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="text-sm font-medium text-accent hover:underline"
            >
              Sign out
            </button>
          </form>
          <div className="mt-4 border-t border-line pt-4">
            <StatusPill />
          </div>
        </div>
      </aside>
      <div className="p-6 lg:p-10">{children}</div>
    </div>
  );
}
