"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/totp";

export type MfaState = { error?: string; ok?: boolean };

export async function confirmMfa(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const session = await requireSession();
  const token = String(formData.get("token") ?? "").trim();
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user?.mfaSecret) return { error: "No pending secret. Reload the page and try again." };
  if (!verifyToken(token, user.mfaSecret)) return { error: "Invalid code. Try again." };

  await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  await audit({ sub: user.id, email: user.email }, "auth.mfa_enabled", "User", user.id);
  revalidatePath("/admin/security");
  return { ok: true };
}

export async function disableMfa() {
  const session = await requireSession();
  await db.user.update({
    where: { id: session.sub },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  await audit({ sub: session.sub, email: session.email }, "auth.mfa_disabled", "User", session.sub);
  revalidatePath("/admin/security");
}
