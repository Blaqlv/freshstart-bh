import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";

export const dynamic = "force-dynamic";

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function PortalHome() {
  const session = await requirePatient();
  const [patient, nextAppt, unread, dueAgg] = await Promise.all([
    db.patient.findUnique({ where: { id: session.sub }, select: { mfaEnabled: true } }),
    db.appointment.findFirst({
      where: { patientId: session.sub, status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULE_REQUESTED"] }, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
    }),
    db.portalMessage.count({
      where: { sender: "STAFF", readAt: null, thread: { patientId: session.sub } },
    }),
    db.billingStatement.aggregate({
      where: { patientId: session.sub, status: "DUE" },
      _sum: { amountCents: true },
    }),
  ]);

  const due = dueAgg._sum.amountCents ?? 0;
  const firstName = session.name.split(" ")[0];

  const cards = [
    {
      href: "/patient-portal/appointments",
      label: "Next appointment",
      value: nextAppt
        ? nextAppt.scheduledAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "None scheduled",
      sub: nextAppt?.serviceName ?? "Request one",
    },
    {
      href: "/patient-portal/messages",
      label: "Unread messages",
      value: String(unread),
      sub: unread ? "From your care team" : "You're all caught up",
    },
    {
      href: "/patient-portal/billing",
      label: "Balance due",
      value: usd(due),
      sub: due ? "View statements" : "Nothing due",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Welcome back, {firstName}</h1>
        <p className="text-sm text-ink-soft">Here&rsquo;s a quick look at your care.</p>
      </div>

      {!patient?.mfaEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand bg-brand-tint p-4">
          <p className="text-sm text-brand-dark">
            <strong>Secure your account.</strong> Turn on two-factor authentication for extra protection.
          </p>
          <Link
            href="/patient-portal/security"
            className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Set up 2FA
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-card border border-line bg-white p-5 hover:border-brand-dark"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{c.label}</p>
            <p className="mt-2 text-xl font-bold text-brand-dark">{c.value}</p>
            <p className="text-xs text-ink-soft">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/patient-portal/refills" className="rounded-card border border-line bg-white p-5 hover:border-brand-dark">
          <p className="font-semibold text-brand-dark">Request a prescription refill</p>
          <p className="mt-1 text-sm text-ink-soft">Send a refill request to your provider for review.</p>
        </Link>
        <Link href="/patient-portal/documents" className="rounded-card border border-line bg-white p-5 hover:border-brand-dark">
          <p className="font-semibold text-brand-dark">Upload a document</p>
          <p className="mt-1 text-sm text-ink-soft">Share records or insurance cards securely.</p>
        </Link>
      </div>
    </div>
  );
}
