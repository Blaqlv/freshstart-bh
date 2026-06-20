"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createPatientSessionCookie } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/totp";

export type PatientLoginState = { error?: string; needsMfa?: boolean };

export async function patientLogin(
  _prev: PatientLoginState,
  formData: FormData,
): Promise<PatientLoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "/patient-portal") || "/patient-portal";

  const patient = await db.patient.findUnique({ where: { email } });
  const passwordOk =
    patient && patient.active && (await bcrypt.compare(password, patient.passwordHash));
  if (!patient || !passwordOk) {
    return { error: "Invalid email or password." };
  }

  // Second factor (TOTP) when the patient has enabled MFA.
  if (patient.mfaEnabled && patient.mfaSecret) {
    if (!token) return { needsMfa: true };
    if (!verifyToken(token, patient.mfaSecret)) {
      await audit({ sub: patient.id, email: patient.email }, "patient.mfa_failed", "Patient", patient.id);
      return { needsMfa: true, error: "Invalid authentication code." };
    }
  }

  await db.patient.update({ where: { id: patient.id }, data: { lastLoginAt: new Date() } });
  await createPatientSessionCookie({ sub: patient.id, email: patient.email, name: patient.name });
  await audit({ sub: patient.id, email: patient.email }, "patient.login", "Patient", patient.id, {
    mfa: patient.mfaEnabled,
  });

  redirect(next.startsWith("/patient-portal") ? next : "/patient-portal");
}
