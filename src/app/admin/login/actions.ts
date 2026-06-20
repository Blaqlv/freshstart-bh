"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/totp";

export type LoginState = { error?: string; needsMfa?: boolean };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "/admin") || "/admin";

  const user = await db.user.findUnique({ where: { email } });
  const passwordOk = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !passwordOk) {
    return { error: "Invalid email or password." };
  }

  // Second factor (TOTP) when enabled.
  if (user.mfaEnabled && user.mfaSecret) {
    if (!token) {
      return { needsMfa: true };
    }
    if (!verifyToken(token, user.mfaSecret)) {
      await audit({ sub: user.id, email: user.email }, "auth.mfa_failed", "User", user.id);
      return { needsMfa: true, error: "Invalid authentication code." };
    }
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSessionCookie({ sub: user.id, email: user.email, name: user.name, role: user.role });
  await audit({ sub: user.id, email: user.email }, "auth.login", "User", user.id, {
    mfa: user.mfaEnabled,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}
