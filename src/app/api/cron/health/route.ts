import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createStatuspageIncident } from "@/lib/statuspage";

/**
 * Health-check cron (A11 step 5 — every 5 min, see vercel.json). Pings the app's
 * own /api/health. Each result is recorded to the audit log; when it transitions
 * to 3 consecutive failures it auto-opens a Statuspage incident (no-op until
 * STATUSPAGE_API_KEY/PAGE_ID are set). Guarded by CRON_SECRET.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ok = false;
  try {
    const res = await fetch(new URL("/api/health", req.url), { cache: "no-store" });
    ok = res.ok;
  } catch {
    ok = false;
  }

  // Look at the previous 3 health checks BEFORE recording this one.
  const prior = await db.auditLog.findMany({
    where: { action: "health.check" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { metadata: true },
  });
  const failed = (m: unknown) => (m as { ok?: boolean } | null)?.ok === false;
  const prevTwoFailed = prior.slice(0, 2).length === 2 && prior.slice(0, 2).every((r) => failed(r.metadata));
  const thirdBackHealthy = !prior[2] || !failed(prior[2].metadata);

  await audit(null, "health.check", "App", undefined, { ok });

  let incidentOpened = false;
  // Transition into 3 consecutive failures (this one + the prior two), and we
  // weren't already in a failing streak — open one incident, not one per tick.
  if (!ok && prevTwoFailed && thirdBackHealthy) {
    incidentOpened = await createStatuspageIncident(
      "Automated health check failing",
      "The application health check has failed 3 consecutive times. Investigating.",
    );
  }

  return NextResponse.json({ ok, incidentOpened });
}
