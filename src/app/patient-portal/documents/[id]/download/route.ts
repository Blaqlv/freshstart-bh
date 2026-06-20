import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { readDocumentBytes } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePatient();
  const { id } = await params;

  const doc = await db.patientDocument.findUnique({ where: { id } });
  if (!doc || doc.patientId !== session.sub || doc.deletedAt || !doc.storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.scanStatus !== "CLEAN") {
    return NextResponse.json({ error: "File is not available." }, { status: 409 });
  }

  const bytes = await readDocumentBytes(doc.storageKey);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Decrypting + serving a PHI document is a tracked access.
  await audit({ sub: session.sub, email: session.email }, "document.download", "PatientDocument", doc.id);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store",
    },
  });
}
