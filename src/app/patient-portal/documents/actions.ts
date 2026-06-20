"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { storePatientDocument, deleteStoredObject } from "@/lib/documents";

const PORTAL = "/patient-portal/documents";

export type UploadState = { error?: string; ok?: boolean };

export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const session = await requirePatient();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to upload." };

  // Scans (before storage), encrypts (AES-256), stores in R2, and audits.
  const result = await storePatientDocument({ sub: session.sub, email: session.email }, file);
  if (!result.ok) return { error: result.error };

  revalidatePath(PORTAL);
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const session = await requirePatient();
  const id = String(formData.get("id"));
  const doc = await db.patientDocument.findUnique({ where: { id } });
  if (!doc || doc.patientId !== session.sub) throw new Error("FORBIDDEN");

  await deleteStoredObject(doc.storageKey);
  await db.patientDocument.update({ where: { id }, data: { deletedAt: new Date(), storageKey: null } });
  await audit({ sub: session.sub, email: session.email }, "document.delete", "PatientDocument", id);
  revalidatePath(PORTAL);
}
