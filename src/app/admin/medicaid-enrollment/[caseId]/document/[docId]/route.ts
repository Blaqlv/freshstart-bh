import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { readEnrollmentDocument } from "@/lib/medicaid/documents";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string; docId: string }> }) {
  await requireCapability("enrollment:read");
  const { caseId, docId } = await ctx.params;
  const doc = await readEnrollmentDocument(caseId, docId);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(doc.bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
