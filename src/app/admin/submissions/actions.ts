"use server";

import { revalidatePath } from "next/cache";
import type { SubmissionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { allowedFormKeys } from "@/lib/submissions";

export async function updateSubmissionStatus(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as SubmissionStatus;

  const sub = await db.formSubmission.findUnique({ where: { id } });
  if (!sub) return;
  if (!allowedFormKeys(session.role).includes(sub.formKey)) throw new Error("FORBIDDEN");

  await db.formSubmission.update({
    where: { id },
    data: { status, handledById: session.sub, handledAt: new Date() },
  });
  await audit({ sub: session.sub, email: session.email }, "submission.status", "FormSubmission", id, { status });
  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/admin/submissions");
}
