import { getDashboardData } from "@/lib/dashboard";
import { MiniBars } from "@/components/dashboard/MiniBars";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-dark">{value}</p>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

const sevStyle: Record<string, string> = {
  LOW: "bg-zinc-200 text-zinc-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Overview</h1>
          <p className="text-sm text-ink-soft">Business &amp; clinical KPIs from live operational data.</p>
        </div>
        <p className="text-xs text-ink-soft">As of {d.generatedAt.toLocaleString()}</p>
      </div>

      {/* Headline KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Appointment requests" value={String(d.appointmentRequests.total)} sub={`${d.appointmentRequests.last30} in last 30 days`} />
        <Kpi label="Website conversions" value={String(d.conversions.total)} sub={`${d.conversions.last30} in last 30 days`} />
        <Kpi label="Medicaid enrollments" value={String(d.medicaidEnrollments.total)} sub={`${d.medicaidEnrollments.last30} in last 30 days`} />
        <Kpi label="Patient satisfaction" value={d.satisfaction.avgRating ? `${d.satisfaction.avgRating}★` : "—"} sub={`${d.satisfaction.reviews} reviews`} />
      </div>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-5">
          <MiniBars data={d.trends.appointmentRequests} label="Appointment requests (6 mo)" />
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <MiniBars data={d.trends.conversions} label="Conversions (6 mo)" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Provider productivity */}
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="font-semibold text-brand-dark">Provider productivity</h2>
          <p className="text-xs text-ink-soft">Appointments by provider</p>
          <ul className="mt-3 space-y-2">
            {d.providerProductivity.length === 0 && <li className="text-sm text-ink-soft">No appointments assigned yet.</li>}
            {d.providerProductivity.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-ink">{p.name}</span>
                <span className="font-semibold text-brand-dark">{p.count}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Incident reports */}
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="font-semibold text-brand-dark">Incident reports</h2>
          <p className="text-xs text-ink-soft">{d.incidents.open} open · {d.incidents.resolvedRate}% resolved</p>
          <ul className="mt-3 space-y-2">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + sevStyle[s]}>{s.toLowerCase()}</span>
                <span className="font-semibold text-brand-dark">{d.incidents.bySeverity[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Compliance metrics */}
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="font-semibold text-brand-dark">Compliance</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Audit events (30d)</dt><dd className="font-semibold text-brand-dark">{d.compliance.auditEvents30}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Incident resolution</dt><dd className="font-semibold text-brand-dark">{d.compliance.incidentResolvedRate}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Intake completion</dt><dd className="font-semibold text-brand-dark">{d.compliance.intakeCompletionRate}%</dd></div>
          </dl>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Intake funnel */}
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="font-semibold text-brand-dark">Intake funnel</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Intakes started</span><span className="font-semibold text-brand-dark">{d.funnel.intakesStarted}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Intakes submitted</span><span className="font-semibold text-brand-dark">{d.funnel.intakesSubmitted}</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-brand" style={{ width: `${d.carf.intakeCompletionRate}%` }} />
            </div>
            <p className="text-xs text-ink-soft">{d.carf.intakeCompletionRate}% completion rate</p>
          </div>
        </section>

        {/* CARF performance indicators */}
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="font-semibold text-brand-dark">CARF performance indicators</h2>
          <p className="text-xs text-ink-soft">Quality indicators tracked for accreditation</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-surface-alt p-3">
              <dd className="text-xl font-bold text-brand-dark">{d.carf.intakeCompletionRate}%</dd>
              <dt className="text-xs text-ink-soft">Intake completion</dt>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <dd className="text-xl font-bold text-brand-dark">{d.carf.incidentResolutionRate}%</dd>
              <dt className="text-xs text-ink-soft">Incident resolution</dt>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <dd className="text-xl font-bold text-brand-dark">{d.carf.avgReviewRating || "—"}</dd>
              <dt className="text-xs text-ink-soft">Avg satisfaction</dt>
            </div>
          </dl>
        </section>
      </div>

      <p className="rounded-card border border-line bg-white p-4 text-xs text-ink-soft">
        Metrics are computed from non-PHI operational metadata (counts, statuses, timestamps).
        Encrypted patient records are never bulk-decrypted for analytics. Page-traffic analytics are
        tracked separately in Vercel Web Analytics; this dashboard can export to Power BI/Tableau later.
      </p>
    </div>
  );
}
