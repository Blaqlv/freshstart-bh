"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin") || "/admin";

  const user = await db.user.findUnique({ where: { email } });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) {
    return { error: "Invalid email or password." };
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await audit({ sub: user.id, email: user.email }, "auth.login", "User", user.id);

  redirect(next.startsWith("/admin") ? next : "/admin");
}
