"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { encryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { notifyStaff } from "@/lib/notify";

export type FormState = { ok?: boolean; error?: string };

const appointmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(7, "A valid phone is required"),
  email: z.string().email("A valid email is required"),
  contactMethod: z.enum(["phone", "email", "text"]).default("phone"),
  location: z.string().min(1, "Please choose a location"),
  service: z.string().min(1, "Please choose a service"),
  consent: z.literal("on", { message: "Consent is required" }),
});

const insuranceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  provider: z.string().min(1, "Insurance provider is required"),
  memberId: z.string().min(1, "Member ID is required"),
  cardFileName: z.string().optional(),
  consent: z.literal("on", { message: "Consent is required" }),
});

function fields(fd: FormData) {
  return Object.fromEntries(fd.entries());
}

export async function submitAppointment(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = appointmentSchema.safeParse(fields(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;
  // Appointment requests collect no clinical info, but we still encrypt the
  // contact payload at rest. Only a non-sensitive label is stored in the clear.
  const sub = await db.formSubmission.create({
    data: {
      formKey: "appointment-request",
      label: `Appointment — ${data.service} @ ${data.location}`,
      encryptedPayload: encryptJson(data),
    },
  });
  await audit(null, "submission.create", "FormSubmission", sub.id, { formKey: "appointment-request" });
  await notifyStaff("New appointment request", `Service ${data.service} at ${data.location}`);
  return { ok: true };
}

export async function submitInsurance(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = insuranceSchema.safeParse(fields(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;
  // Insurance details (DOB, member ID) are sensitive — the entire payload is
  // AES-256-GCM encrypted. (Card image upload is wired through the virus-scanned
  // R2 pipeline in the document-upload phase; here we only record the filename.)
  const sub = await db.formSubmission.create({
    data: {
      formKey: "insurance-verification",
      label: `Insurance verification — ${data.provider}`,
      encryptedPayload: encryptJson(data),
    },
  });
  await audit(null, "submission.create", "FormSubmission", sub.id, { formKey: "insurance-verification" });
  await notifyStaff("New insurance verification request", `Provider: ${data.provider}`);
  return { ok: true };
}
