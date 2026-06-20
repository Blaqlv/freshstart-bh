import type { Metadata } from "next";
import Link from "next/link";
import { CrisisBanner } from "@/components/layout/CrisisBanner";

export const metadata: Metadata = {
  title: "New Patient Intake",
  description: "Securely complete your new patient intake with Fresh Start Behavioral Health.",
  robots: { index: false, follow: false },
};

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrisisBanner />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-dark text-white font-bold">FS</span>
          <div>
            <Link href="/" className="font-bold text-brand-dark">Fresh Start Behavioral Health</Link>
            <p className="text-xs text-ink-soft">New Patient Intake</p>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </>
  );
}
