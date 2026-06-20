"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

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
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role) || id === session.sub) return;
  await db.user.update({ where: { id }, data: { role } });
  await audit({ sub: session.sub, email: session.email }, "user.role", "User", id, { role });
  revalidatePath("/admin/users");
}
