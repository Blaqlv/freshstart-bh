"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function updateForm(formData: FormData) {
  const session = await requireCapability("forms:manage");
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") === "on";
  await db.formDefinition.update({ where: { id }, data: { name: name || undefined, active } });
  await audit({ sub: session.sub, email: session.email }, "form.update", "FormDefinition", id, { active });
  revalidatePath("/admin/forms");
}
