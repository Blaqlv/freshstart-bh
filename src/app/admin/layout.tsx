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

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
    : new Set(capabilitiesFromPermissions(await getEffectivePermissions(session.roleKey)));
  const nav = buildAdminNav({ caps, role: session.role, isSuperAdmin: session.isSuperAdmin });

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
