import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { can, roleLabels } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await requireSession();

  const [pages, published, providers, testimonials, recent] = await Promise.all([
    db.page.count(),
    db.page.count({ where: { status: "PUBLISHED" } }),
    db.provider.count(),
    db.testimonial.count(),
    can(session.role, "audit:read")
      ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
      : Promise.resolve([]),
  ]);

  const stats = [
    { label: "Pages", value: pages, href: "/admin/pages", hint: `${published} published` },
    { label: "Providers", value: providers, href: "/admin/providers" },
    { label: "Testimonials", value: testimonials, href: "/admin/testimonials" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">Welcome back, {session.name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-soft">Signed in as {roleLabels[session.role]}.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-card border border-line bg-white p-5 transition hover:border-brand hover:shadow-sm"
          >
            <p className="text-sm text-ink-soft">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand-dark">{s.value}</p>
            {s.hint && <p className="mt-1 text-xs text-ink-soft">{s.hint}</p>}
          </Link>
        ))}
      </div>

      {can(session.role, "audit:read") && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand-dark">Recent activity</h2>
            <Link href="/admin/audit" className="text-sm font-medium text-brand-dark hover:underline">
              View audit log →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {recent.length === 0 && (
              <li className="p-4 text-sm text-ink-soft">No activity yet.</li>
            )}
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4 text-sm">
                <span>
                  <span className="font-medium text-ink">{r.action}</span>{" "}
                  <span className="text-ink-soft">on {r.entity}</span>
                </span>
                <span className="text-xs text-ink-soft">
                  {r.actorEmail ?? "system"} · {r.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
