import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePatient } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isSandbox } from "@/lib/fhir/config";
import { SANDBOX_PATIENT_ID } from "@/lib/fhir/sandbox-data";
import { makePkcePair, authorizeUrl } from "@/lib/fhir/auth";

export const dynamic = "force-dynamic";

function origin(req: Request) {
  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const session = await requirePatient();

  if (isSandbox()) {
    // No real authorize server in sandbox: link directly to the demo patient.
    await db.patient.update({
      where: { id: session.sub },
      data: { fhirPatientId: SANDBOX_PATIENT_ID, fhirLinkStatus: "linked", fhirLinkedAt: new Date() },
    });
    await audit(session, "patient.fhir.link.sandbox", "Patient", session.sub);
    return NextResponse.redirect(`${origin(req)}/patient-portal/health`);
  }

  const { verifier, challenge } = makePkcePair();
  const state = crypto.randomUUID();
  const jar = await cookies();
  // Short-lived, httpOnly cookies carry the PKCE verifier + state across the redirect.
  jar.set("fhir_pkce_verifier", verifier, { httpOnly: true, secure: true, maxAge: 600, path: "/" });
  jar.set("fhir_pkce_state", state, { httpOnly: true, secure: true, maxAge: 600, path: "/" });
  await db.patient.update({ where: { id: session.sub }, data: { fhirLinkStatus: "pending" } });

  const redirectUri = `${origin(req)}/patient-portal/health/callback`;
  return NextResponse.redirect(authorizeUrl({ redirectUri, state, challenge }));
}
