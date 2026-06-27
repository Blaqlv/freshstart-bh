"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { notifyStaff } from "@/lib/notify";

export async function requestRefillFromEhr(formData: FormData): Promise<void> {
  const session = await requirePatient();
  const medication = String(formData.get("medication") ?? "").trim();
  if (!medication) return;

  const refill = await db.refillRequest.create({
    data: {
      patientId: session.sub,
      medicationEncrypted: encrypt(medication),
      sourceFhirMedication: medication,
      status: "REQUESTED",
    },
  });
  await audit(session, "patient.refill.request.ehr", "RefillRequest", refill.id, {
    source: "ehr",
  });
  await notifyStaff(
    "New medication refill request",
    `A patient requested a refill from their EHR medication list. Review it in the admin portal (refill ${refill.id}).`,
  );
  revalidatePath("/patient-portal/refills");
}
