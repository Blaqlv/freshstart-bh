// Minimal FHIR R4 shapes for the four resources v2.1 reads. We model only the
// fields the UI uses; everything else is ignored. No EHR content is persisted.

export type FhirCoding = { system?: string; code?: string; display?: string };
export type FhirCodeableConcept = { coding?: FhirCoding[]; text?: string };
export type FhirReference = { reference?: string; display?: string };

export interface FhirBundle<T> {
  resourceType: "Bundle";
  type?: string;
  total?: number;
  entry?: { resource: T }[];
}

export interface OperationOutcome {
  resourceType: "OperationOutcome";
  issue?: { severity?: string; code?: string; diagnostics?: string }[];
}

export interface FhirAppointment {
  resourceType: "Appointment";
  id: string;
  status: string;
  start?: string;
  end?: string;
  serviceType?: FhirCodeableConcept[];
  participant?: { actor?: FhirReference; type?: FhirCodeableConcept[] }[];
}

export interface FhirAttachment {
  contentType?: string; // "text/plain" | "text/html"
  data?: string; // base64
  url?: string;
}

export interface FhirDocumentReference {
  resourceType: "DocumentReference";
  id: string;
  date?: string;
  type?: FhirCodeableConcept;
  author?: FhirReference[];
  content?: { attachment?: FhirAttachment }[];
}

export interface FhirMedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  status: string;
  authoredOn?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  dosageInstruction?: { text?: string }[];
  requester?: FhirReference;
}

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  name?: { text?: string; family?: string; given?: string[] }[];
}

// Typed error carrying the parsed OperationOutcome. Never contains PHI bodies.
export class FhirError extends Error {
  constructor(
    public status: number,
    public outcome: OperationOutcome | null,
    message?: string,
  ) {
    super(message ?? `FHIR request failed (${status})`);
    this.name = "FhirError";
  }
}
