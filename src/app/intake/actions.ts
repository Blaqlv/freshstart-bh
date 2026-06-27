"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { encryptJson, decryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { notifyStaff } from "@/lib/notify";
import {
  createIntakeSessionCookie,
  destroyIntakeSessionCookie,
  generateResumeCode,
  hashResumeCode,
  requireIntakeId,
} from "@/lib/intake-auth";
import { INTAKE_STEPS, REVIEW_STEP_INDEX, requiredFieldsFor } from "@/lib/intake";
import { requestContext } from "@/lib/public-submissions";

export type StepState = { error?: string; missing?: string[]; resumeCode?: string };

type IntakeData = Record<string, string>;

export async function startIntake(_prev: StepState, formData: FormData): Promise<StepState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) return { error: "Enter your email to begin." };

  const code = generateResumeCode();
  const intake = await db.intakeSubmission.create({
    data: {
      email,
      currentStep: 0,
      dataEncrypted: encryptJson({ email } satisfies IntakeData),
      resumeTokenHash: hashResumeCode(code),
    },
  });
  await createIntakeSessionCookie(intake.id, code);
  await audit({ sub: intake.id, email }, "intake.start", "IntakeSubmission", intake.id);
  // No PHI in notifications.
  await notifyStaff("New intake started", `An intake was started for ${email}.`);
  redirect("/intake/form");
}

export async function resumeIntake(_prev: StepState, formData: FormData): Promise<StepState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!email || !code) return { error: "Enter your email and resume code." };

  const intake = await db.intakeSubmission.findFirst({
    where: { email, status: "IN_PROGRESS", resumeTokenHash: hashResumeCode(code) },
    orderBy: { createdAt: "desc" },
  });
  if (!intake) return { error: "We couldn't match that email and code." };

  await createIntakeSessionCookie(intake.id, code.toUpperCase());
  await audit({ sub: intake.id, email }, "intake.resume", "IntakeSubmission", intake.id);
  redirect("/intake/form");
}

export async function saveStep(_prev: StepState, formData: FormData): Promise<StepState> {
  const id = await requireIntakeId();
  const intake = await db.intakeSubmission.findUnique({ where: { id } });
  if (!intake) return { error: "Your session expired. Please resume your intake." };
  if (intake.status === "SUBMITTED") redirect("/intake/complete");

  const back = String(formData.get("direction") ?? "next") === "back";
  const stepIndex = Math.min(Math.max(intake.currentStep, 0), REVIEW_STEP_INDEX);
  const step = INTAKE_STEPS[stepIndex];

  const data = decryptJson<IntakeData>(intake.dataEncrypted);

  if (step) {
    for (const field of step.fields) {
      if (field.type === "checkbox") {
        data[field.name] = formData.get(field.name) === "on" ? "Yes" : "";
      } else {
        data[field.name] = String(formData.get(field.name) ?? "").trim();
      }
    }
  }

  // Validate required fields only when moving forward.
  if (!back && step) {
    const missing = requiredFieldsFor(step).filter((name) => !data[name]);
    if (missing.length) {
      // Persist what was entered, but stay on this step.
      await db.intakeSubmission.update({ where: { id }, data: { dataEncrypted: encryptJson(data) } });
      return { error: "Please complete the required fields.", missing };
    }
  }

  const nextStep = Math.min(Math.max(stepIndex + (back ? -1 : 1), 0), REVIEW_STEP_INDEX);
  await db.intakeSubmission.update({
    where: { id },
    data: { dataEncrypted: encryptJson(data), currentStep: nextStep },
  });
  await audit({ sub: id, email: intake.email }, "intake.save", "IntakeSubmission", id, { step: stepIndex });
  redirect("/intake/form");
}

/** Back button on the review step → return to the last question step. */
export async function intakeBack() {
  const id = await requireIntakeId();
  const intake = await db.intakeSubmission.findUnique({ where: { id } });
  if (!intake || intake.status === "SUBMITTED") redirect("/intake/form");
  await db.intakeSubmission.update({ where: { id }, data: { currentStep: REVIEW_STEP_INDEX - 1 } });
  redirect("/intake/form");
}

export async function submitIntake(_prev: StepState, formData: FormData): Promise<StepState> {
  const id = await requireIntakeId();
  const intake = await db.intakeSubmission.findUnique({ where: { id } });
  if (!intake) return { error: "Your session expired. Please resume your intake." };
  if (intake.status === "SUBMITTED") redirect("/intake/complete");

  const signedName = String(formData.get("signedName") ?? "").trim();
  const attest = formData.get("attest") === "on";
  if (!signedName) return { error: "Type your full name to sign." };
  if (!attest) return { error: "Please check the attestation box to submit." };

  const data = decryptJson<IntakeData>(intake.dataEncrypted);
  const requiredConsents = ["consentTreatment", "consentHipaa", "consentFinancial"];
  const missingConsent = requiredConsents.filter((c) => data[c] !== "Yes");
  if (missingConsent.length) {
    return { error: "Required consents are missing. Go back to the Consents step.", missing: missingConsent };
  }

  // Capture SMS consent on the clear columns so v1.4 SMS can use it without
  // decrypting the intake blob (A5 step 3). phone comes from the demographics step.
  const smsConsentGiven = data.smsConsent === "Yes";
  const { ipHash } = await requestContext();
  await db.intakeSubmission.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      signedName,
      signedAt: new Date(),
      submittedAt: new Date(),
      smsConsentGiven,
      smsConsentAt: smsConsentGiven ? new Date() : null,
      smsConsentIpHash: smsConsentGiven ? ipHash : null,
      phoneNumber: data.phone || null,
    },
  });
  await audit({ sub: id, email: intake.email }, "intake.submit", "IntakeSubmission", id);
  await notifyStaff("Intake submitted", `A new patient intake was submitted (${intake.email}).`);
  await destroyIntakeSessionCookie();
  redirect("/intake/complete");
}
