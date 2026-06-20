import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Pre-credential session for the Intake Portal. A new patient has not been
 * verified or issued portal credentials yet, so intake gets its own lightweight
 * session (cookie holds only the intake row id) plus a resume code (email +
 * code) for save-and-resume if the cookie is lost or they switch devices.
 */

export const INTAKE_SESSION_COOKIE = "fs_intake_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days to finish/resume

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function generateResumeCode(): string {
  // 8 hex chars — short enough to read over the phone / from an email.
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function hashResumeCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export async function createIntakeSessionCookie(intakeId: string, code?: string) {
  // The resume code is carried in the (httpOnly, signed) cookie so the form can
  // keep reminding the patient of it — we only store its hash in the database.
  const token = await new SignJWT({ kind: "intake", code: code ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(intakeId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(INTAKE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/intake",
    maxAge: MAX_AGE,
  });
}

export async function destroyIntakeSessionCookie() {
  (await cookies()).delete(INTAKE_SESSION_COOKIE);
}

export type IntakeSession = { id: string; code: string | null };

/** Returns the in-progress intake session from the cookie, or null. */
export async function getIntakeSession(): Promise<IntakeSession | null> {
  const token = (await cookies()).get(INTAKE_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "intake") return null;
    return { id: String(payload.sub), code: (payload.code as string) || null };
  } catch {
    return null;
  }
}

/** Convenience: just the in-progress intake id (or null). */
export async function getIntakeId(): Promise<string | null> {
  return (await getIntakeSession())?.id ?? null;
}

export async function requireIntakeId(): Promise<string> {
  const id = await getIntakeId();
  if (!id) throw new Error("NO_INTAKE_SESSION");
  return id;
}
