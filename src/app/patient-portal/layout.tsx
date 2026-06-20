import type { Metadata } from "next";
import { getPatientSession } from "@/lib/patient-auth";
import { PortalNav, type PortalNavItem } from "@/components/portal/PortalNav";
import { IdleTimeout } from "@/components/portal/IdleTimeout";
import { CrisisBanner } from "@/components/layout/CrisisBanner";
import { patientLogout } from "./actions";

export const metadata: Metadata = {
  title: "Patient Portal",
  robots: { index: false, follow: false },
};

const NAV: PortalNavItem[] = [
  { label: "Overview", href: "/patient-portal" },
  { label: "Messages", href: "/patient-portal/messages" },
  { label: "Appointments", href: "/patient-portal/appointments" },
  { label: "Prescription refills", href: "/patient-portal/refills" },
  { label: "Documents", href: "/patient-portal/documents" },
  { label: "Billing statements", href: "/patient-portal/billing" },
  { label: "Security", href: "/patient-portal/security" },
];

export default async function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getPatientSession();

  // Unauthenticated: the login page renders its own full-screen UI. (Middleware
  // already redirects protected routes here when there is no session.)
  if (!session) return <>{children}</>;

  return (
    <>
      <CrisisBanner />
      <IdleTimeout minutes={15} />
      <div className="grid min-h-screen grid-cols-1 bg-surface-alt lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-line bg-white p-4 lg:min-h-screen">
          <div className="mb-6 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-dark text-white text-sm font-bold">
              FS
            </span>
            <span className="font-bold text-brand-dark">Patient Portal</span>
          </div>
          <PortalNav items={NAV} />
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">{session.name}</p>
            <p className="text-xs text-ink-soft">{session.email}</p>
            <form action={patientLogout} className="mt-3">
              <button type="submit" className="text-sm font-medium text-accent hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <div className="p-6 lg:p-10">{children}</div>
      </div>
    </>
  );
}
