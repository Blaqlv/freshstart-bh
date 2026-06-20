"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";

export async function requestRefill(formData: FormData) {
  const session = await requirePatient();
  const medication = String(formData.get("medication") ?? "").trim();
  const pharmacy = String(formData.get("pharmacy") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!medication) return;

  const refill = await db.refillRequest.create({
    data: {
      patientId: session.sub,
      medicationEncrypted: encrypt(medication),
      pharmacyEncrypted: pharmacy ? encrypt(pharmacy) : null,
      notesEncrypted: notes ? encrypt(notes) : null,
      status: "REQUESTED",
    },
  });
  await audit(session, "patient.refill.request", "RefillRequest", refill.id);
  revalidatePath("/patient-portal/refills");
}
