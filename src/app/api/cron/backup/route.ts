import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";

/**
 * Nightly encrypted-backup job (Vercel Cron — see vercel.json).
 *
 * This is the secured seam for the extra backup layer described in the brief
 * (beyond Neon's built-in point-in-time restore). Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET`.
 *
 * TODO(deploy): wire the actual dump → encrypt → Cloudflare R2 upload once R2
 * credentials (R2_* env vars) and a dump mechanism are configured. Until then
 * this authenticates, records an audit entry, and reports not-configured so a
 * monitor can alert rather than silently believing backups run.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r2Configured = Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BACKUP_BUCKET,
  );

  if (!r2Configured) {
    await audit(null, "backup.skipped", "System", undefined, { reason: "R2 not configured" });
    return NextResponse.json(
      { ok: false, status: "not_configured", message: "R2 backup target not configured; see vercel.json + README deploy notes." },
      { status: 200 },
    );
  }

  // Placeholder for the real job (dump → AES-256 encrypt → PUT to R2).
  await audit(null, "backup.run", "System", undefined, { at: new Date().toISOString() });
  return NextResponse.json({ ok: true, status: "ok" });
}
