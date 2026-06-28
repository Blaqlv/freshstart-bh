// src/lib/fhir/sandbox-data.ts
import "server-only";
import type {
  FhirAppointment,
  FhirDocumentReference,
  FhirMedicationRequest,
} from "./types";

/** A single synthetic demo patient used in sandbox mode. No real PHI. */
export const SANDBOX_PATIENT_ID = "sandbox-patient-001";

export const sandboxAppointments: FhirAppointment[] = [
  {
    resourceType: "Appointment",
    id: "appt-1",
    status: "booked",
    start: new Date(Date.now() + 3 * 86400000).toISOString(),
    serviceType: [{ text: "Individual Therapy" }],
    participant: [{ actor: { display: "Dr. Maria Alvarez" } }],
  },
  {
    resourceType: "Appointment",
    id: "appt-2",
    status: "booked",
    start: new Date(Date.now() + 10 * 86400000).toISOString(),
    serviceType: [{ text: "Medication Management" }],
    participant: [{ actor: { display: "Dr. James Okafor" } }],
  },
];

export const sandboxNotes: FhirDocumentReference[] = [
  {
    resourceType: "DocumentReference",
    id: "note-1",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    type: { text: "Progress Note" },
    author: [{ display: "Dr. Maria Alvarez" }],
    content: [
      {
        attachment: {
          contentType: "text/plain",
          // base64 of a short synthetic note
          data: Buffer.from(
            "Patient reports improved sleep and reduced anxiety. Continue current plan. Follow up in 2 weeks.",
          ).toString("base64"),
        },
      },
    ],
  },
  {
    resourceType: "DocumentReference",
    id: "note-2",
    date: new Date(Date.now() - 30 * 86400000).toISOString(),
    type: { text: "Intake Summary" },
    author: [{ display: "Intake Team" }],
    content: [
      {
        attachment: {
          contentType: "text/html",
          data: Buffer.from(
            "<p><strong>Chief concern:</strong> anxiety and low mood.</p><p>Plan: weekly therapy.</p>",
          ).toString("base64"),
        },
      },
    ],
  },
];

export const sandboxMedications: FhirMedicationRequest[] = [
  {
    resourceType: "MedicationRequest",
    id: "med-1",
    status: "active",
    authoredOn: new Date(Date.now() - 20 * 86400000).toISOString(),
    medicationCodeableConcept: { text: "Sertraline 50 mg tablet" },
    dosageInstruction: [{ text: "Take 1 tablet by mouth daily" }],
    requester: { display: "Dr. James Okafor" },
  },
];
