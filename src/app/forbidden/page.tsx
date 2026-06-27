import Link from "next/link";
import type { Metadata } from "next";
import { StandaloneChrome } from "@/components/layout/StandaloneChrome";
import { getSession } from "@/lib/auth";
import { getPatientSession } from "@/lib/patient-auth";
import { roleLabels } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Access Denied",
  robots: { index: false, follow: false },
};

/**
 * Explicit 403 (A7). RBAC middleware / server guards redirect here when a
 * signed-in user lacks permission. Shows who they are and a route back to the
 * right dashboard; unauthenticated visitors get a Sign In prompt.
 */
export default async function ForbiddenPage() {
  const staff = await getSession().catch(() => null);
  const patient = staff ? null : await getPatientSession().catch(() => null);

  return (
    <StandaloneChrome>
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-brand-dark">Access Denied</h1>
        <p className="mt-4 text-ink-soft">
          You don&apos;t have permission to access this page.
        </p>

        {staff ? (
          <div className="mt-8">
            <p className="text-sm text-ink-soft">
              Signed in as <span className="font-semibold text-ink">{staff.name}</span>{" "}
              ({roleLabels[staff.role]})
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover"
            >
              Back to Admin Dashboard
            </Link>
          </div>
        ) : patient ? (
          <div className="mt-8">
            <p className="text-sm text-ink-soft">
              Signed in as <span className="font-semibold text-ink">{patient.name}</span>
            </p>
            <Link
              href="/patient-portal"
              className="mt-4 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover"
            >
              Back to Patient Portal
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <Link
              href="/admin/login"
              className="inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover"
            >
              Sign In
            </Link>
          </div>
        )}
      </section>
    </StandaloneChrome>
  );
}
