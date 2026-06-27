"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";

/**
 * Update a patient's communication preferences (A5 / E6). Writes immediately and
 * audits the change. Turning SMS consent off clears smsConsentGiven so no SMS is
 * ever sent after the patient opts out (E6 step 3, source patient_portal_settings).
 */
export async function updateCommunicationPreferences(formData: FormData): Promise<void> {
  const session = await requirePatient();
  const on = (name: string) => formData.get(name) === "on";

  const smsConsentGiven = on("smsConsentGiven");
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim() || null;

  const existing = await db.patient.findUnique({
    where: { id: session.sub },
    select: { smsConsentGiven: true },
  });

  await db.patient.update({
    where: { id: session.sub },
    data: {
      phoneNumber,
      smsConsentGiven,
      // Stamp consent time only on a fresh opt-in.
      smsConsentAt: smsConsentGiven && !existing?.smsConsentGiven ? new Date() : undefined,
      smsAppointmentReminders: on("smsAppointmentReminders"),
      smsPortalAlerts: on("smsPortalAlerts"),
      emailAppointmentReminders: on("emailAppointmentReminders"),
      emailPortalAlerts: on("emailPortalAlerts"),
    },
  });

  await audit({ sub: session.sub, email: session.email }, "patient.commPrefs.update", "Patient", session.sub, {
    smsConsentGiven,
    source: "patient_portal_settings",
  });
  revalidatePath("/patient-portal/settings");
}
