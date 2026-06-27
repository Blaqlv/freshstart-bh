"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function linkFhirPatient(formData: FormData): Promise<void> {
  const session = await requireCapability("patients:manage");
  const patientId = String(formData.get("patientId") ?? "");
  const fhirPatientId = String(formData.get("fhirPatientId") ?? "").trim();
  if (!patientId || !fhirPatientId) return;
  await db.patient.update({
    where: { id: patientId },
    data: { fhirPatientId, fhirLinkStatus: "linked", fhirLinkedAt: new Date() },
  });
  await audit(session, "admin.patient.fhir.link", "Patient", patientId);
  revalidatePath(`/admin/patients/${patientId}`);
}

export async function unlinkFhirPatient(formData: FormData): Promise<void> {
  const session = await requireCapability("patients:manage");
  const patientId = String(formData.get("patientId") ?? "");
  if (!patientId) return;
  await db.patient.update({
    where: { id: patientId },
    data: { fhirPatientId: null, fhirLinkStatus: "unlinked", fhirLinkedAt: null },
  });
  await audit(session, "admin.patient.fhir.unlink", "Patient", patientId);
  revalidatePath(`/admin/patients/${patientId}`);
}
