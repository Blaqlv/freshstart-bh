import Link from "next/link";
import { IntakeResume } from "@/components/intake/IntakeResume";

export const dynamic = "force-dynamic";

export default function ResumePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Resume your intake</h1>
        <p className="mt-1 text-ink-soft">
          Enter the email you started with and the resume code we showed you.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <IntakeResume />
      </div>
      <p className="text-sm text-ink-soft">
        Lost your code? <Link href="/contact" className="font-medium text-accent hover:underline">Contact us</Link> and
        we&rsquo;ll help — or <Link href="/intake" className="font-medium text-accent hover:underline">start over</Link>.
      </p>
    </div>
  );
}
