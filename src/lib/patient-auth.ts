import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Patient Portal session — deliberately SEPARATE from the staff admin session
 * (different cookie, different model). Short, sliding expiry enforces the
 * required 15-minute idle timeout: each authenticated request re-issues the
 * cookie (see middleware), so 15 minutes of inactivity logs the patient out.
 */

export const PATIENT_SESSION_COOKIE = "fs_patient_session";
export const IDLE_TIMEOUT_SECONDS = 15 * 60; // 15-minute idle timeout (per brief)

export type PatientSession = {
  sub: string;
  email: string;
  name: string;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signPatientSession(session: PatientSession): Promise<string> {
  return new SignJWT({ email: session.email, name: session.name, kind: "patient" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${IDLE_TIMEOUT_SECONDS}s`)
    .sign(secret());
}

export async function verifyPatientSession(token: string): Promise<PatientSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "patient") return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

export async function createPatientSessionCookie(session: PatientSession) {
  const token = await signPatientSession(session);
  (await cookies()).set(PATIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/patient-portal",
    maxAge: IDLE_TIMEOUT_SECONDS,
  });
}

export async function destroyPatientSessionCookie() {
  (await cookies()).delete(PATIENT_SESSION_COOKIE);
}

export async function getPatientSession(): Promise<PatientSession | null> {
  const token = (await cookies()).get(PATIENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyPatientSession(token);
}

/** Throws if not authenticated. Use in patient-portal server components/actions. */
export async function requirePatient(): Promise<PatientSession> {
  const s = await getPatientSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}
