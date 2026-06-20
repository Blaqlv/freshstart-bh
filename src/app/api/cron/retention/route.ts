import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { deleteStoredObject } from "@/lib/documents";

/**
 * Document retention sweep (Vercel Cron — see vercel.json). Permanently purges
 * documents that were soft-deleted more than the grace window ago: removes any
 * lingering object and hard-deletes the metadata row. Guarded by CRON_SECRET.
 */
export const dynamic = "force-dynamic";

const GRACE_DAYS = Number(process.env.DOC_RETENTION_GRACE_DAYS ?? 30);

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - GRACE_DAYS * 86_400_000);
  const stale = await db.patientDocument.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, storageKey: true },
  });

  for (const d of stale) {
    await deleteStoredObject(d.storageKey);
  }
  if (stale.length) {
    await db.patientDocument.deleteMany({ where: { id: { in: stale.map((d) => d.id) } } });
    await audit(null, "retention.purge", "PatientDocument", undefined, { purged: stale.length, graceDays: GRACE_DAYS });
  }

  return NextResponse.json({ ok: true, purged: stale.length });
}
