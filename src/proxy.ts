import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const ADMIN_COOKIE = "fs_admin_session";
const PATIENT_COOKIE = "fs_patient_session";
const PATIENT_IDLE_SECONDS = 15 * 60;

/**
 * Route-level gate for the authenticated portals. Verifies signed session
 * cookies at the edge (no DB). Fine-grained checks happen again at the
 * data-access layer (requireCapability / requirePatient) — never trust the
 * route alone.
 *
 * Patient Portal additionally gets a sliding session: each authenticated
 * request re-issues the cookie with a fresh 15-minute expiry, so inactivity —
 * not a fixed lifetime — ends the session (the required idle timeout).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET ? new TextEncoder().encode(process.env.AUTH_SECRET) : null;

  if (pathname.startsWith("/patient-portal")) {
    return patientGate(req, secret);
  }

  // Admin portal + analytics dashboard share the staff session.
  if (pathname === "/admin/login") return NextResponse.next();
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  let valid = false;
  if (token && secret) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

async function patientGate(req: NextRequest, secret: Uint8Array | null) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/patient-portal/login";

  const token = req.cookies.get(PATIENT_COOKIE)?.value;
  let payload: Record<string, unknown> | null = null;
  if (token && secret) {
    try {
      const verified = (await jwtVerify(token, secret)).payload as Record<string, unknown>;
      if (verified.kind === "patient") payload = verified;
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    if (isLogin) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/patient-portal/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/patient-portal";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Slide the session forward (fresh 15-minute expiry).
  const res = NextResponse.next();
  if (secret) {
    const refreshed = await new SignJWT({ email: payload.email, name: payload.name, kind: "patient" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(payload.sub))
      .setIssuedAt()
      .setExpirationTime(`${PATIENT_IDLE_SECONDS}s`)
      .sign(secret);
    res.cookies.set(PATIENT_COOKIE, refreshed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/patient-portal",
      maxAge: PATIENT_IDLE_SECONDS,
    });
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/patient-portal/:path*"],
};
