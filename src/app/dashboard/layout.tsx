import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { roleLabels } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Route is also gated at the edge (proxy) and here at the data layer.
  const session = await requireCapability("dashboard:read");

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-dark text-white text-sm font-bold">FS</span>
            <div>
              <p className="font-bold text-brand-dark">Analytics Dashboard</p>
              <p className="text-xs text-ink-soft">{session.name} · {roleLabels[session.role]}</p>
            </div>
          </div>
          <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
            ← Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
