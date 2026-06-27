import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePatient } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { exchangeCode } from "@/lib/fhir/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requirePatient();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const verifier = jar.get("fhir_pkce_verifier")?.value;
  const expectedState = jar.get("fhir_pkce_state")?.value;

  const fail = () => NextResponse.redirect(`${url.origin}/patient-portal/health?link=error`);
  if (!code || !state || !verifier || state !== expectedState) return fail();

  try {
    const redirectUri = `${url.origin}/patient-portal/health/callback`;
    const { patientFhirId } = await exchangeCode({ code, redirectUri, verifier });
    if (!patientFhirId) return fail();
    await db.patient.update({
      where: { id: session.sub },
      data: { fhirPatientId: patientFhirId, fhirLinkStatus: "linked", fhirLinkedAt: new Date() },
    });
    await audit(session, "patient.fhir.link", "Patient", session.sub);
  } catch {
    return fail();
  } finally {
    jar.delete("fhir_pkce_verifier");
    jar.delete("fhir_pkce_state");
  }
  return NextResponse.redirect(`${url.origin}/patient-portal/health`);
}
