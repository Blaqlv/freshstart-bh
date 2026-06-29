import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { type Capability } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { getEffectivePermissions, moduleIsEnabled } from "@/lib/permissions";
import { CAPABILITY_PERMISSIONS } from "@/lib/capability-map";
import { db } from "@/lib/db";
import { effectiveRoleKey } from "@/lib/roles";

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
  roleKey: string;
  isSuperAdmin: boolean;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({
    email: session.email,
    name: session.name,
    role: session.role,
    roleKey: session.roleKey,
    isSuperAdmin: session.isSuperAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role,
      roleKey: typeof payload.roleKey === "string" ? payload.roleKey : role.toLowerCase(),
      isSuperAdmin: payload.isSuperAdmin === true,
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

/** Fresh identity for the logged-in user, memoized once per request. */
const getCurrentUser = cache(async (sub: string) => {
  return db.user.findUnique({
    where: { id: sub },
    select: {
      id: true, email: true, name: true,
      role: true, customRoleKey: true, active: true, isSuperAdmin: true,
    },
  });
});

/** Throws if not authenticated OR the user is missing/deactivated.
 *  Re-resolves role/super-admin/active from the DB each request — the JWT's
 *  baked claims are advisory. Use in server components / actions. */
export async function requireSession(): Promise<Session> {
  const cookieSession = await getSession();
  if (!cookieSession) throw new Error("UNAUTHENTICATED");
  const user = await getCurrentUser(cookieSession.sub);
  if (!user || !user.active) throw new Error("UNAUTHENTICATED");
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleKey: effectiveRoleKey(user),
    isSuperAdmin: user.isSuperAdmin,
  };
}

/** Throws if the session lacks the capability (DB-backed, live per request). */
export async function requireCapability(capability: Capability): Promise<Session> {
  const s = await requireSession();
  if (s.isSuperAdmin) return s;
  const required = CAPABILITY_PERMISSIONS[capability] ?? [];
  if (required.length === 0) throw new Error("FORBIDDEN");
  const perms = await getEffectivePermissions(s.roleKey);
  if (!required.every((p) => perms.has(p))) throw new Error("FORBIDDEN");
  return s;
}

/**
 * Redirects non-Super-Admins away from Super-Admin-only routes.
 * Uses redirect() (throws NEXT_REDIRECT) — call outside any try/catch.
 */
export async function requireSuperAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!s.isSuperAdmin) redirect("/admin/unavailable");
  return s;
}

/**
 * Redirects to /admin/unavailable when a module is globally disabled.
 * Uses redirect() (throws NEXT_REDIRECT) — call outside any try/catch.
 */
export async function requireModule(moduleKey: string): Promise<void> {
  if (!(await moduleIsEnabled(moduleKey))) {
    redirect(`/admin/unavailable?m=${encodeURIComponent(moduleKey)}`);
  }
}
