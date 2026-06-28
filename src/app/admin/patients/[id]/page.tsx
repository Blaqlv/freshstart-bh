import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { EhrSandboxBanner } from "@/components/EhrSandboxBanner";
import { getEhrSummary } from "@/lib/fhir/adapter";
import { isSandbox } from "@/lib/fhir/config";
import { SANDBOX_PATIENT_ID } from "@/lib/fhir/sandbox-data";
import { linkFhirPatient, unlinkFhirPatient } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("patients:read");
  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, fhirPatientId: true, fhirLinkStatus: true },
  });
  if (!patient) notFound();

  const linked = patient.fhirLinkStatus === "linked" && !!patient.fhirPatientId;
  const fhirId = isSandbox() ? SANDBOX_PATIENT_ID : patient.fhirPatientId ?? "";
  const canManage = can(session.role, "patients:manage");

  let summary = null;
  let summaryError = false;
  if (linked) {
    try {
      summary = await getEhrSummary(fhirId);
    } catch {
      summaryError = true;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">{patient.name}</h1>
      <p className="text-sm text-ink-soft">{patient.email}</p>
      <EhrSandboxBanner />

      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">EHR Summary</h2>
        <p className="mb-4 text-xs text-ink-soft">
          Sourced from EHR — read only. To update records, use the EHR directly.
        </p>

        {!linked ? (
          <p className="text-sm text-ink-soft">This patient is not linked to an EHR record.</p>
        ) : summaryError || !summary ? (
          <p className="text-sm text-amber-900">EHR summary is unavailable right now.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-soft">Recent appointments</dt>
              <dd className="text-sm text-ink">
                {summary.recentAppointments.length === 0
                  ? "None"
                  : summary.recentAppointments
                      .map((a) => `${new Date(a.start).toLocaleDateString()} — ${a.serviceType}`)
                      .join("; ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Active medications</dt>
              <dd className="text-sm text-ink">{summary.activeMedicationCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Most recent note</dt>
              <dd className="text-sm text-ink">
                {summary.latestNote
                  ? `${summary.latestNote.type} (${
                      summary.latestNote.date
                        ? new Date(summary.latestNote.date).toLocaleDateString()
                        : "—"
                    })`
                  : "None"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {canManage && (
        <section className="rounded-card border border-line bg-white p-6">
          <h2 className="text-lg font-semibold text-ink">Manual EHR link</h2>
          <p className="mb-4 text-xs text-ink-soft">
            Use this when the automatic patient-authorization flow fails.
          </p>
          <form action={linkFhirPatient} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <label className="text-sm">
              <span className="mb-1 block text-ink-soft">FHIR patient ID</span>
              <input
                name="fhirPatientId"
                defaultValue={patient.fhirPatientId ?? ""}
                className="rounded-lg border border-line px-3 py-2"
              />
            </label>
            <button type="submit" className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white">
              Link
            </button>
          </form>
          {linked && (
            <form action={unlinkFhirPatient} className="mt-3">
              <input type="hidden" name="patientId" value={patient.id} />
              <button type="submit" className="text-sm text-accent hover:underline">
                Unlink
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
