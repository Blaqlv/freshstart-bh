"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";

const PORTAL = "/patient-portal/documents";
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

export type UploadState = { error?: string; ok?: boolean };

export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const session = await requirePatient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (!ACCEPTED.includes(file.type)) return { error: "Allowed types: PDF, JPG, PNG, DOCX." };
  if (file.size > MAX_BYTES) return { error: "File exceeds the 15MB limit." };

  // NOTE: object storage (Cloudflare R2) and the virus-scan-before-store step
  // are wired in the upload-pipeline phase. For now we record audited metadata
  // only — no file bytes are persisted — so the data model + trail exist.
  const doc = await db.patientDocument.create({
    data: {
      patientId: session.sub,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: null,
      scanStatus: "PENDING",
    },
  });
  await audit(session, "patient.document.upload", "PatientDocument", doc.id, { name: file.name, size: file.size });
  revalidatePath(PORTAL);
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const session = await requirePatient();
  const id = String(formData.get("id"));
  const doc = await db.patientDocument.findUnique({ where: { id } });
  if (!doc || doc.patientId !== session.sub) throw new Error("FORBIDDEN");
  await db.patientDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(session, "patient.document.delete", "PatientDocument", id);
  revalidatePath(PORTAL);
}
