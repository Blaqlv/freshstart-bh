"use server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { setCaseStatus, setChecklistItem, updateCaseFields, setMcoStatus } from "@/lib/medicaid/cases";
import { setDocumentReview, storeEnrollmentDocument } from "@/lib/medicaid/documents";
import type { CaseStatus, McoStatus, DocStatus } from "@/lib/medicaid/constants";

async function actor() {
  const s = await requireCapability("enrollment:manage");
  return { sub: s.sub, email: s.email };
}
function refresh(caseId: string) {
  revalidatePath(`/admin/medicaid-enrollment/${caseId}`);
}

export async function changeStatusAction(formData: FormData): Promise<void> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  await setCaseStatus(a, caseId, String(formData.get("status")) as CaseStatus);
  refresh(caseId);
}

export async function toggleChecklistAction(formData: FormData): Promise<void> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  await setChecklistItem(a, String(formData.get("itemId")), { isComplete: formData.get("complete") === "true" });
  refresh(caseId);
}

export async function checklistNoteAction(formData: FormData): Promise<void> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  await setChecklistItem(a, String(formData.get("itemId")), { notes: String(formData.get("notes") ?? "") });
  refresh(caseId);
}

export async function updateCaseAction(formData: FormData): Promise<void> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  await updateCaseFields(a, caseId, {
    notes: String(formData.get("notes") ?? ""),
    assignedTo: (formData.get("assignedTo") as string) || null,
    ohioMedicaidId: (formData.get("ohioMedicaidId") as string) || null,
    targetDeadline: (formData.get("targetDeadline") as string) || null,
  });
  refresh(caseId);
}

export async function mcoStatusAction(formData: FormData): Promise<void> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  await setMcoStatus(a, String(formData.get("mcoId")), String(formData.get("status")) as McoStatus, String(formData.get("notes") ?? ""));
  refresh(caseId);
}

export async function reviewDocumentAction(formData: FormData): Promise<void> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  await setDocumentReview(a, String(formData.get("docId")), String(formData.get("status")) as DocStatus, String(formData.get("note") ?? ""));
  refresh(caseId);
}

export type UploadDocState = { error?: string; ok?: boolean };
export async function uploadDocumentAction(_prev: UploadDocState, formData: FormData): Promise<UploadDocState> {
  const a = await actor();
  const caseId = String(formData.get("caseId"));
  const res = await storeEnrollmentDocument(a, caseId, String(formData.get("documentType")), formData.get("file") as File);
  refresh(caseId);
  return res.ok ? { ok: true } : { error: res.error };
}
