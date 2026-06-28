"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createCase } from "@/lib/medicaid/cases";
import { newCaseSchema } from "@/lib/medicaid/constants";

export type CreateCaseState = { error?: string };

export async function createCaseAction(_prev: CreateCaseState, formData: FormData): Promise<CreateCaseState> {
  const session = await requireCapability("enrollment:manage");
  const parsed = newCaseSchema.safeParse({
    providerName: formData.get("providerName"),
    providerNpi: formData.get("providerNpi"),
    caseType: formData.get("caseType"),
    assignedTo: formData.get("assignedTo") || undefined,
    targetDeadline: formData.get("targetDeadline") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const id = await createCase({ sub: session.sub, email: session.email }, parsed.data);
  revalidatePath("/admin/medicaid-enrollment");
  redirect(`/admin/medicaid-enrollment/${id}`);
}
