import "server-only";
import { db } from "@/lib/db";

/**
 * Dashboard aggregates built from our own Postgres data — no third-party BI.
 *
 * IMPORTANT: every metric here is derived from NON-PHI metadata (counts,
 * statuses, timestamps, and the clear-text submission `label`). Encrypted PHI
 * payloads are never bulk-decrypted for analytics. (Per-record decryption stays
 * gated + audited in the admin queues.)
 */

const DAY = 86_400_000;

function monthKey(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short" });
}

export type MonthlyPoint = { label: string; value: number };

export type DashboardData = {
  generatedAt: Date;
  appointmentRequests: { total: number; last30: number };
  conversions: { total: number; last30: number };
  medicaidEnrollments: { total: number; last30: number };
  satisfaction: { avgRating: number; reviews: number };
  providerProductivity: { name: string; count: number }[];
  incidents: { open: number; total: number; resolvedRate: number; bySeverity: Record<string, number> };
  compliance: { auditEvents30: number; incidentResolvedRate: number; intakeCompletionRate: number };
  carf: { intakeCompletionRate: number; incidentResolutionRate: number; avgReviewRating: number };
  trends: { appointmentRequests: MonthlyPoint[]; conversions: MonthlyPoint[] };
  funnel: { intakesStarted: number; intakesSubmitted: number };
};

export async function getDashboardData(): Promise<DashboardData> {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since6mo = new Date(now - 182 * DAY);

  const [
    apptSubTotal,
    apptSub30,
    portalApptTotal,
    portalAppt30,
    insTotal,
    ins30,
    intakeSubmittedTotal,
    intakeSubmitted30,
    medicaidTotal,
    medicaid30,
    reviewAgg,
    providerGroups,
    incidentsAll,
    audit30,
    intakesStarted,
    apptSubRows,
    insRows,
    intakeRows,
  ] = await Promise.all([
    db.formSubmission.count({ where: { formKey: "appointment-request" } }),
    db.formSubmission.count({ where: { formKey: "appointment-request", createdAt: { gte: since30 } } }),
    db.appointment.count(),
    db.appointment.count({ where: { createdAt: { gte: since30 } } }),
    db.formSubmission.count({ where: { formKey: "insurance-verification" } }),
    db.formSubmission.count({ where: { formKey: "insurance-verification", createdAt: { gte: since30 } } }),
    db.intakeSubmission.count({ where: { status: "SUBMITTED" } }),
    db.intakeSubmission.count({ where: { status: "SUBMITTED", submittedAt: { gte: since30 } } }),
    db.formSubmission.count({ where: { formKey: "insurance-verification", label: { contains: "Medicaid", mode: "insensitive" } } }),
    db.formSubmission.count({ where: { formKey: "insurance-verification", label: { contains: "Medicaid", mode: "insensitive" }, createdAt: { gte: since30 } } }),
    db.testimonial.aggregate({ _avg: { rating: true }, _count: true, where: { status: "PUBLISHED" } }),
    db.appointment.groupBy({ by: ["providerName"], _count: { _all: true }, where: { providerName: { not: null } } }),
    db.incidentReport.findMany({ select: { status: true, severity: true } }),
    db.auditLog.count({ where: { createdAt: { gte: since30 } } }),
    db.intakeSubmission.count(),
    db.formSubmission.findMany({ where: { formKey: "appointment-request", createdAt: { gte: since6mo } }, select: { createdAt: true } }),
    db.formSubmission.findMany({ where: { formKey: "insurance-verification", createdAt: { gte: since6mo } }, select: { createdAt: true } }),
    db.intakeSubmission.findMany({ where: { status: "SUBMITTED", submittedAt: { gte: since6mo } }, select: { submittedAt: true } }),
  ]);

  const apptTotal = apptSubTotal + portalApptTotal;
  const appt30 = apptSub30 + portalAppt30;

  const conversionsTotal = apptSubTotal + insTotal + intakeSubmittedTotal;
  const conversions30 = apptSub30 + ins30 + intakeSubmitted30;

  // Incidents.
  const incTotal = incidentsAll.length;
  const incResolved = incidentsAll.filter((i) => i.status === "RESOLVED").length;
  const incOpen = incidentsAll.filter((i) => i.status !== "RESOLVED").length;
  const bySeverity: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const i of incidentsAll) bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
  const incResolvedRate = incTotal ? Math.round((incResolved / incTotal) * 100) : 100;

  const intakeCompletionRate = intakesStarted ? Math.round((intakeSubmittedTotal / intakesStarted) * 100) : 0;

  // 6-month trend buckets (oldest → newest).
  const months: { label: string; start: number; end: number }[] = [];
  const cursor = new Date(now);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 5; i >= 0; i--) {
    const start = new Date(cursor);
    start.setMonth(start.getMonth() - i);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    months.push({ label: monthKey(start), start: start.getTime(), end: end.getTime() });
  }
  const bucket = (rows: { createdAt?: Date | null; submittedAt?: Date | null }[], pick: (r: { createdAt?: Date | null; submittedAt?: Date | null }) => Date | null | undefined) =>
    months.map((m) => ({
      label: m.label,
      value: rows.filter((r) => {
        const d = pick(r)?.getTime();
        return d !== undefined && d !== null && d >= m.start && d < m.end;
      }).length,
    }));

  const apptTrend = bucket(apptSubRows, (r) => r.createdAt);
  const convRows = [...apptSubRows, ...insRows, ...intakeRows.map((r) => ({ createdAt: r.submittedAt }))];
  const convTrend = bucket(convRows, (r) => r.createdAt);

  const avgRating = Math.round((reviewAgg._avg.rating ?? 0) * 10) / 10;

  return {
    generatedAt: new Date(now),
    appointmentRequests: { total: apptTotal, last30: appt30 },
    conversions: { total: conversionsTotal, last30: conversions30 },
    medicaidEnrollments: { total: medicaidTotal, last30: medicaid30 },
    satisfaction: { avgRating, reviews: reviewAgg._count },
    providerProductivity: providerGroups
      .map((g) => ({ name: g.providerName ?? "Unassigned", count: g._count._all }))
      .sort((a, b) => b.count - a.count),
    incidents: { open: incOpen, total: incTotal, resolvedRate: incResolvedRate, bySeverity },
    compliance: {
      auditEvents30: audit30,
      incidentResolvedRate: incResolvedRate,
      intakeCompletionRate,
    },
    carf: {
      intakeCompletionRate,
      incidentResolutionRate: incResolvedRate,
      avgReviewRating: avgRating,
    },
    trends: { appointmentRequests: apptTrend, conversions: convTrend },
    funnel: { intakesStarted, intakesSubmitted: intakeSubmittedTotal },
  };
}
