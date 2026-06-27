"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { TranslationStatus } from "@prisma/client";

const VALID: TranslationStatus[] = ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVIEW", "APPROVED"];

/** Update a page's Spanish translation status (D3). Admin / Clinical Director only. */
export async function setTranslationStatus(pageId: string, formData: FormData): Promise<void> {
  const session = await requireCapability("content:publish");
  const status = String(formData.get("status") ?? "");
  if (!VALID.includes(status as TranslationStatus)) return;
  await db.page.update({
    where: { id: pageId },
    data: { translationStatus: status as TranslationStatus },
  });
  await audit(session, "page.translationStatus", "Page", pageId, { status });
  revalidatePath("/admin/translations");
}
