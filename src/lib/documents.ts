import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encryptBuffer, decryptBuffer } from "@/lib/crypto";
import { putObject, getObject, deleteObject, storageBackend } from "@/lib/storage";
import { scanBuffer } from "@/lib/scan";

/**
 * Shared "Secure Document Upload" pipeline (Forms §4), used by the Patient
 * Portal (and reusable by Intake / insurance-card uploads). Flow:
 *   validate → virus scan (before storage) → AES-256 encrypt → store in R2 →
 *   audit. Downloads decrypt + audit; deletes remove the object + audit.
 */

export const ACCEPTED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
export const MAX_BYTES = 15 * 1024 * 1024; // 15MB

type Actor = { sub: string; email: string };
export type StoreResult = { ok: true; id: string } | { ok: false; error: string };

export async function storePatientDocument(actor: Actor, file: File): Promise<StoreResult> {
  if (!file || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (!ACCEPTED_MIME[file.type]) return { ok: false, error: "Allowed types: PDF, JPG, PNG, DOCX." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File exceeds the 15MB limit." };

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Virus scan BEFORE anything is stored.
  const scan = await scanBuffer(buffer);
  if (!scan.clean) {
    await audit(actor, "document.rejected", "PatientDocument", undefined, {
      name: file.name,
      engine: scan.engine,
      signature: scan.signature,
    });
    return { ok: false, error: "This file looks unsafe (failed a virus scan) and was not stored." };
  }

  // 2. Encrypt at the app layer, then 3. store the ciphertext.
  const key = `patient/${actor.sub}/${crypto.randomUUID()}`;
  await putObject(key, encryptBuffer(buffer), "application/octet-stream");

  const doc = await db.patientDocument.create({
    data: {
      patientId: actor.sub,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: key,
      scanStatus: "CLEAN",
    },
  });
  await audit(actor, "document.upload", "PatientDocument", doc.id, {
    name: file.name,
    size: file.size,
    engine: scan.engine,
    backend: storageBackend(),
  });
  return { ok: true, id: doc.id };
}

/** Fetch + decrypt a stored document's bytes. Caller must enforce ownership. */
export async function readDocumentBytes(storageKey: string): Promise<Buffer | null> {
  const cipher = await getObject(storageKey);
  if (!cipher) return null;
  return decryptBuffer(cipher);
}

export async function deleteStoredObject(storageKey: string | null): Promise<void> {
  if (storageKey) await deleteObject(storageKey);
}
