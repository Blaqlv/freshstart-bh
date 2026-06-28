import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { getNoteContent } from "@/lib/fhir/adapter";
import { isSandbox } from "@/lib/fhir/config";
import { SANDBOX_PATIENT_ID } from "@/lib/fhir/sandbox-data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requirePatient();
  const patient = await db.patient.findUnique({
    where: { id: session.sub },
    select: { fhirPatientId: true, fhirLinkStatus: true },
  });
  if (patient?.fhirLinkStatus !== "linked") {
    return NextResponse.json({ error: "not linked" }, { status: 403 });
  }
  const fhirId = isSandbox() ? SANDBOX_PATIENT_ID : patient.fhirPatientId ?? "";
  const { id } = await ctx.params;
  try {
    const content = await getNoteContent(fhirId, id);
    // No-store: clinical content must never be cached by the browser or CDN.
    return new NextResponse(content.html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
