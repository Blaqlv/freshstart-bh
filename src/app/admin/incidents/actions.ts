"use server";

import { revalidatePath } from "next/cache";
import type { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function createIncident(formData: FormData) {
  const session = await requireCapability("incidents:manage");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const severity = String(formData.get("severity") ?? "MEDIUM") as IncidentSeverity;
  if (!title || !description) return;

  const inc = await db.incidentReport.create({
    data: { title, description, category, severity, reportedById: session.sub, reportedByEmail: session.email },
  });
  await audit({ sub: session.sub, email: session.email }, "incident.create", "IncidentReport", inc.id, { severity });
  revalidatePath("/admin/incidents");
}

export async function updateIncident(formData: FormData) {
  const session = await requireCapability("incidents:manage");
  const id = String(formData.get("id"));
  const status = String(formData.get("status") ?? "OPEN") as IncidentStatus;
  const resolution = String(formData.get("resolution") ?? "").trim() || null;
  await db.incidentReport.update({ where: { id }, data: { status, resolution } });
  await audit({ sub: session.sub, email: session.email }, "incident.update", "IncidentReport", id, { status });
  revalidatePath("/admin/incidents");
}
