import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";

const tabs = [
  { label: "Modules", href: "/admin/system" },
  { label: "Roles", href: "/admin/system/roles" },
  { label: "Audit", href: "/admin/system/audit" },
];

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin(); // redirects non-supers to /admin/unavailable

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">System control</h1>
        <p className="text-sm text-ink-soft">Super Admin only. Changes apply immediately, no deploy.</p>
      </div>
      <nav className="flex gap-2 border-b border-line" aria-label="System control tabs">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="px-3 py-2 text-sm font-medium text-ink hover:text-brand-dark">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
