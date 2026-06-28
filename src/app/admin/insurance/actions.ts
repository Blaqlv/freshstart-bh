// src/app/admin/insurance/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function setReviewedAction(formData: FormData): Promise<void> {
  const session = await requireCapability("billing:manage");
  const id = String(formData.get("id"));
  const reviewed = formData.get("reviewed") === "true";
  await db.verificationAttempt.update({
    where: { id },
    data: { staffReviewed: reviewed, staffReviewedAt: reviewed ? new Date() : null, staffReviewedBy: reviewed ? session.sub : null },
  });
  await audit(session, "eligibility.review", "VerificationAttempt", id, { reviewed });
  revalidatePath("/admin/insurance");
}
