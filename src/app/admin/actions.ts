"use server";

import { redirect } from "next/navigation";
import { destroySessionCookie, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function logout() {
  const s = await getSession();
  if (s) await audit({ sub: s.sub, email: s.email }, "auth.logout", "User", s.sub);
  await destroySessionCookie();
  redirect("/admin/login");
}
