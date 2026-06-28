// src/app/admin/settings/payers/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function savePayerAction(formData: FormData): Promise<void> {
  const session = await requireCapability("billing:manage");
  const id = String(formData.get("id") ?? "");
  const payerCode = String(formData.get("payerCode") ?? "").trim();
  const isActive = formData.get("isActive") === "true";
  if (!id) return;
  await db.insurancePayer.update({ where: { id }, data: { payerCode, isActive } });
  await audit(session, "payer.update", "InsurancePayer", id, { payerCode, isActive });
  revalidatePath("/admin/settings/payers");
}

export async function addPayerAction(formData: FormData): Promise<void> {
  const session = await requireCapability("billing:manage");
  const name = String(formData.get("name") ?? "").trim();
  const payerCode = String(formData.get("payerCode") ?? "").trim();
  if (!name) return;
  const p = await db.insurancePayer.create({ data: { name, payerCode } });
  await audit(session, "payer.create", "InsurancePayer", p.id, { name, payerCode });
  revalidatePath("/admin/settings/payers");
}
