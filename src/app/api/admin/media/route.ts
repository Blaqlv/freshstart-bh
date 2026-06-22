import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "content:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      url: true,
      alt: true,
      mimeType: true,
      width: true,
      height: true,
      sizeBytes: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ items });
}
