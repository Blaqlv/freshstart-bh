import Link from "next/link";
import { requirePatient } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { EhrSandboxBanner } from "@/components/EhrSandboxBanner";
import { getAppointments, getNotes, getMedications } from "@/lib/fhir/adapter";
import { isSandbox } from "@/lib/fhir/config";
import { SANDBOX_PATIENT_ID } from "@/lib/fhir/sandbox-data";
import { ClinicalNoteModal } from "./ClinicalNoteModal";
import { requestRefillFromEhr } from "./actions";
import { CRISIS_PHONE } from "@/lib/constants";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "appointments", label: "Upcoming Appointments" },
  { id: "notes", label: "Clinical Notes" },
  { id: "medications", label: "Medications" },
] as const;

export default async function MyHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requirePatient();
  const patient = await db.patient.findUnique({
    where: { id: session.sub },
    select: { fhirPatientId: true, fhirLinkStatus: true },
  });

  const linked = patient?.fhirLinkStatus === "linked" && !!patient.fhirPatientId;
  // In sandbox mode every linked patient maps to the demo patient id.
  const fhirId = isSandbox() ? SANDBOX_PATIENT_ID : patient?.fhirPatientId ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">My Health</h1>
      <EhrSandboxBanner />

      {!linked ? (
        <ConnectPrompt />
      ) : (
        <HealthTabs tab={(await searchParams).tab} fhirId={fhirId} refillAction={requestRefillFromEhr} />
      )}
    </div>
  );
}

function ConnectPrompt() {
  return (
    <div className="rounded-card border border-line bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Connect your health record</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Connect your health record to view appointments, notes, and medications.
      </p>
      <Link
        href="/patient-portal/health/connect"
        className="mt-4 inline-block rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white"
      >
        Connect Now
      </Link>
    </div>
  );
}

async function HealthTabs({
  tab,
  fhirId,
  refillAction,
}: {
  tab?: string;
  fhirId: string;
  refillAction: (formData: FormData) => Promise<void>;
}) {
  const active = TABS.find((t) => t.id === tab)?.id ?? "appointments";
  return (
    <div>
      <nav className="mb-4 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/patient-portal/health?tab=${t.id}`}
            aria-current={active === t.id ? "page" : undefined}
            className={
              active === t.id
                ? "border-b-2 border-brand-dark px-3 py-2 text-sm font-medium text-brand-dark"
                : "px-3 py-2 text-sm text-ink-soft hover:text-ink"
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {active === "appointments" && <AppointmentsTab fhirId={fhirId} />}
      {active === "notes" && <NotesTab fhirId={fhirId} />}
      {active === "medications" && <MedicationsTab fhirId={fhirId} refillAction={refillAction} />}
    </div>
  );
}

async function AppointmentsTab({ fhirId }: { fhirId: string }) {
  let appts;
  try {
    appts = await getAppointments(fhirId);
  } catch {
    return <ErrorState />;
  }
  if (appts.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-6">
        <p className="text-sm text-ink-soft">You have no upcoming appointments.</p>
        <Link
          href="/patient-portal/appointments"
          className="mt-3 inline-block rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white"
        >
          Schedule an Appointment
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {appts.map((a) => (
        <li key={a.id} className="rounded-card border border-line bg-white p-4">
          <div className="font-medium text-ink">{new Date(a.start).toLocaleString()}</div>
          <div className="text-sm text-ink-soft">
            {a.serviceType} · {a.providerName} · {a.status}
          </div>
          <Link
            href="/patient-portal/appointments"
            className="mt-2 inline-block text-sm text-accent hover:underline"
          >
            Need to reschedule?
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function NotesTab({ fhirId }: { fhirId: string }) {
  let notes;
  try {
    notes = await getNotes(fhirId);
  } catch {
    return <ErrorState />;
  }
  if (notes.length === 0)
    return <p className="text-sm text-ink-soft">No clinical notes are available yet.</p>;
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="rounded-card border border-line bg-white p-4">
          <div className="font-medium text-ink">{n.type}</div>
          <div className="text-sm text-ink-soft">
            {n.date ? new Date(n.date).toLocaleDateString() : ""} · {n.author}
          </div>
          <ClinicalNoteModal noteId={n.id} title={n.type} />
        </li>
      ))}
    </ul>
  );
}

async function MedicationsTab({
  fhirId,
  refillAction,
}: {
  fhirId: string;
  refillAction: (formData: FormData) => Promise<void>;
}) {
  let meds;
  try {
    meds = await getMedications(fhirId);
  } catch {
    return <ErrorState />;
  }
  return (
    <div>
      <ul className="space-y-3">
        {meds.map((m) => (
          <li key={m.id} className="rounded-card border border-line bg-white p-4">
            <div className="font-medium text-ink">{m.name}</div>
            <div className="text-sm text-ink-soft">
              {m.dosage} · {m.prescriber}
              {m.lastPrescribed ? ` · ${new Date(m.lastPrescribed).toLocaleDateString()}` : ""}
            </div>
            <form action={refillAction} className="mt-2">
              <input type="hidden" name="medication" value={m.name} />
              <button type="submit" className="text-sm text-accent hover:underline">
                Request Refill
              </button>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-soft">
        This list is pulled from your clinical record and may not reflect recent changes.
        Contact your provider for questions.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      We couldn&apos;t load this from your health record right now. Please try again later or call
      us at {CRISIS_PHONE}.
    </div>
  );
}
