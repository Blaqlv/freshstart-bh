// src/lib/medicaid/documents.ts
import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encryptBuffer, decryptBuffer } from "@/lib/crypto";
import { putObject, getObject, storageBackend } from "@/lib/storage";
import { scanBuffer } from "@/lib/scan";
import { ACCEPTED_MIME, MAX_BYTES } from "@/lib/documents";
import { getActiveTenantId } from "./tenant";
import { DOC_TYPES, type DocStatus, type DocType } from "./constants";

type Actor = { sub: string; email: string };
export type StoreResult = { ok: true; id: string } | { ok: false; error: string };

export async function storeEnrollmentDocument(
  actor: Actor,
  caseId: string,
  documentType: string,
  file: File,
): Promise<StoreResult> {
  const tenantId = await getActiveTenantId();
  const c = await db.medicaidEnrollmentCase.findFirst({ where: { id: caseId, tenantId } });
  if (!c) return { ok: false, error: "Case not found." };
  if (!DOC_TYPES.includes(documentType as DocType)) return { ok: false, error: "Invalid document type." };
  if (!file || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (!ACCEPTED_MIME[file.type]) return { ok: false, error: "Allowed types: PDF, JPG, PNG, DOCX." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File exceeds the 15MB limit." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const scan = await scanBuffer(buffer);
  if (!scan.clean) {
    await audit(actor, "enrollment.document.rejected", "EnrollmentDocument", undefined, { caseId, name: file.name, signature: scan.signature });
    return { ok: false, error: "This file looks unsafe (failed a virus scan) and was not stored." };
  }

  const key = `enrollment/${caseId}/${crypto.randomUUID()}`;
  await putObject(key, encryptBuffer(buffer), "application/octet-stream");
  const doc = await db.enrollmentDocument.create({
    data: {
      tenantId,
      caseId,
      documentType,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: key,
      scanStatus: "CLEAN",
      status: "uploaded",
      uploadedBy: actor.sub,
    },
  });
  await db.enrollmentAuditEntry.create({ data: { tenantId, caseId, action: "document.upload", performedBy: actor.sub, notes: `${documentType}: ${file.name}` } });
  await audit(actor, "enrollment.document.upload", "EnrollmentDocument", doc.id, { caseId, name: file.name, backend: storageBackend() });
  return { ok: true, id: doc.id };
}

/** Tenant-scoped fetch + decrypt. Returns the document row + plaintext bytes, or null. */
export async function readEnrollmentDocument(
  caseId: string,
  docId: string,
): Promise<{ fileName: string; mimeType: string; bytes: Buffer } | null> {
  const tenantId = await getActiveTenantId();
  const doc = await db.enrollmentDocument.findFirst({ where: { id: docId, caseId, tenantId } });
  if (!doc?.storageKey) return null;
  const cipher = await getObject(doc.storageKey);
  if (!cipher) return null;
  return { fileName: doc.fileName, mimeType: doc.mimeType, bytes: decryptBuffer(cipher) };
}

export async function setDocumentReview(actor: Actor, docId: string, status: DocStatus, note?: string): Promise<void> {
  const tenantId = await getActiveTenantId();
  const doc = await db.enrollmentDocument.findFirst({ where: { id: docId, tenantId } });
  if (!doc) return;
  await db.enrollmentDocument.update({ where: { id: docId }, data: { status, ...(note !== undefined ? { reviewNote: note } : {}) } });
  await db.enrollmentAuditEntry.create({ data: { tenantId, caseId: doc.caseId, action: "document.review", performedBy: actor.sub, notes: `${doc.fileName}: ${status}` } });
  await audit(actor, "enrollment.document.review", "EnrollmentDocument", docId, { caseId: doc.caseId, status });
}
