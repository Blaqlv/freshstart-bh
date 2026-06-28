"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { effectiveRoleKey } from "@/lib/roles";
import { applyRoleAssignment } from "@/lib/system/assign";
import { sendEmail } from "@/lib/notify";

const ROLES: Role[] = [
  "ADMINISTRATOR",
  "CLINICAL_DIRECTOR",
  "COMPLIANCE_OFFICER",
  "RECEPTIONIST",
  "PROVIDER",
  "BILLING_STAFF",
];

export async function createUser(formData: FormData) {
  const session = await requireCapability("users:manage");
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const password = String(formData.get("password") ?? "");

  if (!email || !name || !ROLES.includes(role) || password.length < 8) return;
  if (await db.user.findUnique({ where: { email } })) return;

  const user = await db.user.create({
    data: { email, name, role, passwordHash: bcrypt.hashSync(password, 10) },
  });
  await audit({ sub: session.sub, email: session.email }, "user.create", "User", user.id, { role });
  revalidatePath("/admin/users");
}

export async function setUserActive(formData: FormData) {
  const session = await requireCapability("users:manage");
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  if (id === session.sub) return; // don't deactivate yourself
  await db.user.update({ where: { id }, data: { active } });
  await audit({ sub: session.sub, email: session.email }, active ? "user.activate" : "user.deactivate", "User", id);
  revalidatePath("/admin/users");
}

export async function setUserRole(formData: FormData) {
  const session = await requireCapability("users:manage");
  const id = String(formData.get("id"));
  const key = String(formData.get("role") ?? "");
  if (!id || id === session.sub) return; // can't change your own role

  const user = await db.user.findUnique({
    where: { id },
    select: { role: true, customRoleKey: true, email: true, name: true },
  });
  if (!user) return;
  const from = effectiveRoleKey(user);
  if (key === from) return; // no change

  const res = await applyRoleAssignment({ userId: id, key, actorIsSuperAdmin: session.isSuperAdmin });
  if (!res.ok) return; // gate/validation failure — no-op (UI only offers valid options)

  await audit({ sub: session.sub, email: session.email }, "user.role", "User", id, { from, to: key });

  // Best-effort courtesy email — never block the role change on email.
  const role = await db.systemRole.findUnique({ where: { key }, select: { label: true } });
  try {
    await sendEmail({
      to: user.email,
      subject: "Your access role has changed",
      text:
        `Hello ${user.name},\n\n` +
        `Your access role has been updated to "${role?.label ?? key}" by ${session.name}.\n` +
        `If you have questions, contact your administrator.`,
    });
  } catch {
    // ignore — email is a courtesy, not a gate
  }

  revalidatePath("/admin/users");
}
