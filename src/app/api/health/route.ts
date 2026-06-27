import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Lightweight health check (A11 step 5). Confirms the app is up and the database
 * answers a trivial query. Returns 503 on DB failure so the cron can detect it.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch {
    return NextResponse.json({ status: "error", db: "error" }, { status: 503 });
  }
}
