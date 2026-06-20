"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";

const PORTAL = "/patient-portal/appointments";

export async function requestAppointment(formData: FormData) {
  const session = await requirePatient();
  const locationId = String(formData.get("locationId") ?? "") || null;
  const serviceSlug = String(formData.get("serviceSlug") ?? "") || null;
  const when = String(formData.get("scheduledAt") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!when) return;

  const [location, service] = await Promise.all([
    locationId ? db.location.findUnique({ where: { id: locationId } }) : null,
    serviceSlug ? db.service.findUnique({ where: { slug: serviceSlug } }) : null,
  ]);

  const appt = await db.appointment.create({
    data: {
      patientId: session.sub,
      locationId,
      locationName: location?.name ?? null,
      serviceSlug,
      serviceName: service?.title ?? null,
      scheduledAt: new Date(when),
      status: "REQUESTED",
      reasonEncrypted: reason ? encrypt(reason) : null,
    },
  });
  await audit(session, "patient.appointment.request", "Appointment", appt.id);
  revalidatePath(PORTAL);
}

async function ownAppointment(patientId: string, id: string) {
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt || appt.patientId !== patientId) throw new Error("FORBIDDEN");
  return appt;
}

export async function requestReschedule(formData: FormData) {
  const session = await requirePatient();
  const id = String(formData.get("id"));
  const when = String(formData.get("scheduledAt") ?? "");
  await ownAppointment(session.sub, id);
  if (!when) return;
  await db.appointment.update({
    where: { id },
    data: { scheduledAt: new Date(when), status: "RESCHEDULE_REQUESTED" },
  });
  await audit(session, "patient.appointment.reschedule", "Appointment", id);
  revalidatePath(PORTAL);
}

export async function cancelAppointment(formData: FormData) {
  const session = await requirePatient();
  const id = String(formData.get("id"));
  await ownAppointment(session.sub, id);
  await db.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(session, "patient.appointment.cancel", "Appointment", id);
  revalidatePath(PORTAL);
}
