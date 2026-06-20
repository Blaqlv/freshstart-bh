import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { can, type Capability } from "@/lib/rbac";

/**
 * Lightweight admin session: a jose-signed JWT in an httpOnly cookie.
 * Verifiable in middleware (edge, no DB). This is the Phase 2 gate; Phase 5
 * layers Auth.js + TOTP MFA on the same User/Role model.
 */

export const SESSION_COOKIE = "fs_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8h

export type Session = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ email: session.email, name: session.name, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(session: Session) {
  const token = await signSession(session);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Throws if not authenticated. Use in server components / actions. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}

/** Throws if the session lacks the capability (data-layer enforcement). */
export async function requireCapability(capability: Capability): Promise<Session> {
  const s = await requireSession();
  if (!can(s.role, capability)) throw new Error("FORBIDDEN");
  return s;
}
