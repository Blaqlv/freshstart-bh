"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/totp";

export type MfaState = { error?: string; ok?: boolean };

export async function confirmPatientMfa(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const session = await requirePatient();
  const token = String(formData.get("token") ?? "").trim();
  const patient = await db.patient.findUnique({ where: { id: session.sub } });
  if (!patient?.mfaSecret) return { error: "No pending secret. Reload the page and try again." };
  if (!verifyToken(token, patient.mfaSecret)) return { error: "Invalid code. Try again." };

  await db.patient.update({ where: { id: patient.id }, data: { mfaEnabled: true } });
  await audit(session, "patient.mfa_enabled", "Patient", patient.id);
  revalidatePath("/patient-portal/security");
  return { ok: true };
}

export async function disablePatientMfa() {
  const session = await requirePatient();
  await db.patient.update({
    where: { id: session.sub },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  await audit(session, "patient.mfa_disabled", "Patient", session.sub);
  revalidatePath("/patient-portal/security");
}
