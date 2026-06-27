// src/lib/fhir/adapter.ts
import "server-only";
import { isSandbox, ehrEnv } from "./config";
import { fhirGet } from "./client";
import { getSystemToken } from "./auth";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  sandboxAppointments,
  sandboxMedications,
  sandboxNotes,
} from "./sandbox-data";
import type {
  FhirAppointment,
  FhirBundle,
  FhirDocumentReference,
  FhirMedicationRequest,
} from "./types";

// ---- Normalized view models the UI consumes (no raw FHIR leaks to components) ----
export interface ApptView {
  id: string;
  start: string;
  providerName: string;
  serviceType: string;
  status: string;
}
export interface NoteView {
  id: string;
  date: string;
  type: string;
  author: string;
}
export interface NoteContent {
  html: string; // sanitized, render-ready
}
export interface MedView {
  id: string;
  name: string;
  dosage: string;
  prescriber: string;
  lastPrescribed: string;
}
export interface EhrSummary {
  recentAppointments: ApptView[]; // up to 3
  activeMedicationCount: number;
  latestNote: NoteView | null;
}

function bundleEntries<T>(b: FhirBundle<T>): T[] {
  return (b.entry ?? []).map((e) => e.resource);
}

// ---- Public API: sandbox returns fixtures; production calls FHIR via system token ----

export async function getAppointments(patientFhirId: string): Promise<ApptView[]> {
  const today = new Date().toISOString().slice(0, 10);
  const raw = isSandbox()
    ? sandboxAppointments
    : await fetchBundle<FhirAppointment>(
        `/Appointment?patient=${patientFhirId}&status=booked&date=ge${today}`,
        patientFhirId,
        "Appointment",
      );
  return raw.map((a) => ({
    id: a.id,
    start: a.start ?? "",
    providerName: a.participant?.[0]?.actor?.display ?? "Your provider",
    serviceType: a.serviceType?.[0]?.text ?? "Appointment",
    status: a.status,
  }));
}

export async function getNotes(patientFhirId: string): Promise<NoteView[]> {
  const raw = isSandbox()
    ? sandboxNotes
    : await fetchBundle<FhirDocumentReference>(
        `/DocumentReference?patient=${patientFhirId}&category=clinical-note&_sort=-date&_count=10`,
        patientFhirId,
        "DocumentReference",
      );
  return raw.map((d) => ({
    id: d.id,
    date: d.date ?? "",
    type: d.type?.text ?? "Clinical Note",
    author: d.author?.[0]?.display ?? "Care team",
  }));
}

export async function getNoteContent(patientFhirId: string, noteId: string): Promise<NoteContent> {
  let doc: FhirDocumentReference | undefined;
  if (isSandbox()) {
    doc = sandboxNotes.find((n) => n.id === noteId);
  } else {
    const token = await getSystemToken();
    doc = await fhirGet<FhirDocumentReference>(`/DocumentReference/${noteId}`, token, {
      patientFhirId,
      resourceType: "DocumentReference",
    });
  }
  const att = doc?.content?.[0]?.attachment;
  if (!att?.data) return { html: "<p>This note has no readable content.</p>" };
  const decoded = Buffer.from(att.data, "base64").toString("utf8");
  // text/html is sanitized; text/plain is escaped into a <pre>.
  if (att.contentType === "text/html") return { html: sanitizeHtml(decoded) };
  return { html: `<pre class="whitespace-pre-wrap font-sans">${escapeHtml(decoded)}</pre>` };
}

export async function getMedications(patientFhirId: string): Promise<MedView[]> {
  const raw = isSandbox()
    ? sandboxMedications
    : await fetchBundle<FhirMedicationRequest>(
        `/MedicationRequest?patient=${patientFhirId}&status=active`,
        patientFhirId,
        "MedicationRequest",
      );
  return raw.map((m) => ({
    id: m.id,
    name: m.medicationCodeableConcept?.text ?? "Medication",
    dosage: m.dosageInstruction?.[0]?.text ?? "",
    prescriber: m.requester?.display ?? "Your provider",
    lastPrescribed: m.authoredOn ?? "",
  }));
}

export async function getEhrSummary(patientFhirId: string): Promise<EhrSummary> {
  const [appts, meds, notes] = await Promise.all([
    getAppointments(patientFhirId),
    getMedications(patientFhirId),
    getNotes(patientFhirId),
  ]);
  return {
    recentAppointments: appts.slice(0, 3),
    activeMedicationCount: meds.length,
    latestNote: notes[0] ?? null,
  };
}

async function fetchBundle<T>(path: string, patientFhirId: string, resourceType: string): Promise<T[]> {
  ehrEnv(); // validates production env
  const token = await getSystemToken();
  const bundle = await fhirGet<FhirBundle<T>>(path, token, { patientFhirId, resourceType });
  return bundleEntries(bundle);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
