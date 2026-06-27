"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { encryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { notifyStaff } from "@/lib/notify";
import { checkRateLimit, TOO_MANY_REQUESTS } from "@/lib/rate-limit";
import { logPublicSubmission, requestContext } from "@/lib/public-submissions";
import { HONEYPOT_FIELD } from "@/components/forms/HoneypotField";

export type FormState = { ok?: boolean; error?: string };

const appointmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(7, "A valid phone is required"),
  email: z.string().email("A valid email is required"),
  contactMethod: z.enum(["phone", "email", "text"]).default("phone"),
  location: z.string().min(1, "Please choose a location"),
  service: z.string().min(1, "Please choose a service"),
  consent: z.literal("on", { message: "Consent is required" }),
  // SMS opt-in is independent of the contact consent (A5).
  smsConsent: z.string().optional(),
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

/** True when the hidden honeypot field was filled — i.e. a bot (A8). */
function honeypotTripped(fd: FormData): boolean {
  const v = fd.get(HONEYPOT_FIELD);
  return typeof v === "string" && v.trim().length > 0;
}

export async function submitAppointment(_prev: FormState, fd: FormData): Promise<FormState> {
  const { ipHash, userAgent } = await requestContext();

  // Honeypot: silently discard, log only, fake success (A8).
  if (honeypotTripped(fd)) {
    await logPublicSubmission({
      formType: "appointment_request",
      ipHash,
      userAgent,
      payload: { note: "honeypot" },
      status: "honeypot_triggered",
    });
    return { ok: true };
  }

  // Rate limit: 5 / IP / hour (A8).
  const rl = await checkRateLimit(ipHash, 5, "1h");
  if (!rl.ok) return { error: TOO_MANY_REQUESTS };

  const parsed = appointmentSchema.safeParse(fields(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;
  const smsConsent = data.smsConsent === "on";
  const smsConsentAt = smsConsent ? new Date().toISOString() : null;

  // Appointment requests collect no clinical info, but we still encrypt the
  // contact payload at rest. SMS consent + a hashed IP travel with it so v1.4
  // SMS sending has clean, attributable consent data (A5).
  const sub = await db.formSubmission.create({
    data: {
      formKey: "appointment-request",
      label: `Appointment — ${data.service} @ ${data.location}`,
      encryptedPayload: encryptJson({ ...data, smsConsent, smsConsentAt, smsConsentIpHash: ipHash }),
    },
  });
  await audit(null, "submission.create", "FormSubmission", sub.id, { formKey: "appointment-request" });

  // Immutable public-form audit log — non-PHI metadata only (A2).
  await logPublicSubmission({
    formType: "appointment_request",
    ipHash,
    userAgent,
    payload: {
      service: data.service,
      location: data.location,
      preferredContact: data.contactMethod,
      smsConsent,
    },
  });

  await notifyStaff("New appointment request", `Service ${data.service} at ${data.location}`);
  return { ok: true };
}

export async function submitInsurance(_prev: FormState, fd: FormData): Promise<FormState> {
  const { ipHash, userAgent } = await requestContext();

  if (honeypotTripped(fd)) {
    await logPublicSubmission({
      formType: "insurance_verification",
      ipHash,
      userAgent,
      payload: { note: "honeypot" },
      status: "honeypot_triggered",
    });
    return { ok: true };
  }

  // Rate limit: 3 / IP / hour (A8).
  const rl = await checkRateLimit(ipHash, 3, "1h");
  if (!rl.ok) return { error: TOO_MANY_REQUESTS };

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

  // Public-form audit log: NO DOB / member id — only the carrier name and whether
  // a card image was attached, so the receptionist queue stays usable (A2).
  await logPublicSubmission({
    formType: "insurance_verification",
    ipHash,
    userAgent,
    payload: { provider: data.provider, cardAttached: Boolean(data.cardFileName) },
  });

  await notifyStaff("New insurance verification request", `Provider: ${data.provider}`);
  return { ok: true };
}
