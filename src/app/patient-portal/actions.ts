"use server";

import { redirect } from "next/navigation";
import { destroyPatientSessionCookie, getPatientSession } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";

export async function patientLogout() {
  const session = await getPatientSession();
  if (session) await audit(session, "patient.logout", "Patient", session.sub);
  await destroyPatientSessionCookie();
  redirect("/patient-portal/login");
}
