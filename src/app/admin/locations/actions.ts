"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { syncLocationToGBP } from "@/lib/gbp-sync";

/**
 * Manual "Sync to Google Business Profile" (A4 step 5). Administrator only.
 * On failure the audit log records gbp_sync_failed (A4 step 4).
 */
export async function syncLocationAction(locationId: string): Promise<void> {
  const session = await requireSession();
  if (session.role !== "ADMINISTRATOR") return;

  const result = await syncLocationToGBP(locationId);
  await audit(
    session,
    result.ok ? "gbp_sync" : "gbp_sync_failed",
    "Location",
    locationId,
    { ...result },
  );
  revalidatePath("/admin/locations");
}
