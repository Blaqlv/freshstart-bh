import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { site } from "@/lib/site";
import { portalMessageAlert } from "@/lib/sms-templates";

/**
 * Telnyx SMS sending (E1). Uses the Telnyx REST API directly (no SDK dependency),
 * env-guarded: without TELNYX_API_KEY / _PHONE_NUMBER it no-ops and reports
 * `skipped` so nothing breaks before credentials are provisioned.
 *
 * Callers are responsible for confirming smsConsentGiven before calling — most
 * use the `sendSmsToPatient` helper which enforces consent + channel prefs.
 */

const API_KEY = process.env.TELNYX_API_KEY;
const FROM = process.env.TELNYX_PHONE_NUMBER;
const PROFILE = process.env.TELNYX_MESSAGING_PROFILE_ID;

export function hashPhone(phone: string): string {
  return crypto.createHash("sha256").update(phone.replace(/[^\d+]/g, "")).digest("hex");
}

/** Cap at 2 SMS segments and collapse whitespace to control cost (E1 step 4). */
export function sanitizeSmsBody(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, 320);
}

export type SmsResult = { ok: boolean; skipped?: boolean; id?: string; reason?: string };

export async function sendSms(to: string, body: string, templateName = "ad_hoc"): Promise<SmsResult> {
  const text = sanitizeSmsBody(body);
  if (!API_KEY || !FROM) {
    await logSms(to, templateName, "skipped_unconfigured");
    return { ok: false, skipped: true, reason: "telnyx_not_configured" };
  }
  try {
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        text,
        ...(PROFILE ? { messaging_profile_id: PROFILE } : {}),
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { data?: { id?: string } };
    const id = data?.data?.id;
    await logSms(to, templateName, res.ok ? "sent" : `error_${res.status}`, id);
    return res.ok ? { ok: true, id } : { ok: false, reason: `telnyx_http_${res.status}` };
  } catch {
    await logSms(to, templateName, "request_failed");
    return { ok: false, reason: "telnyx_request_failed" };
  }
}

/** Audit every outbound SMS — hashed recipient, template, status, provider id (E2 step 3). */
async function logSms(to: string, templateName: string, status: string, id?: string) {
  await audit(null, "sms.send", "Sms", undefined, {
    toHash: hashPhone(to),
    template: templateName,
    status,
    telnyxId: id ?? null,
  });
}

/**
 * Consent-aware send to a known patient (E2/E3/E7). Enforces smsConsentGiven and,
 * optionally, a per-channel preference flag. Returns skipped if the patient has
 * not consented or lacks a phone number.
 */
export async function sendSmsToPatient(
  patientId: string,
  build: (locale: "en" | "es") => string,
  opts: { templateName: string; channel?: "smsAppointmentReminders" | "smsPortalAlerts" } = {
    templateName: "ad_hoc",
  },
): Promise<SmsResult> {
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient?.smsConsentGiven || !patient.phoneNumber) {
    return { ok: false, skipped: true, reason: "no_consent_or_phone" };
  }
  if (opts.channel && !patient[opts.channel]) {
    return { ok: false, skipped: true, reason: "channel_disabled" };
  }
  const locale = patient.preferredLanguage === "es" ? "es" : "en";
  return sendSms(patient.phoneNumber, build(locale), opts.templateName);
}

const PORTAL_SMS_DEBOUNCE_MS = 15 * 60 * 1000;

/**
 * Portal new-message alert (E3). No clinical content — just a nudge to log in.
 * Debounced: at most one SMS per 15 minutes per patient, regardless of how many
 * messages arrive. Call this from the staff "reply to patient" action when that
 * exists (the current build has no staff-originated message path).
 */
export async function notifyPatientOfPortalMessage(patientId: string): Promise<SmsResult> {
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient?.smsConsentGiven || !patient.phoneNumber || !patient.smsPortalAlerts) {
    return { ok: false, skipped: true, reason: "no_consent_or_disabled" };
  }
  if (patient.lastPortalSmsAt && Date.now() - patient.lastPortalSmsAt.getTime() < PORTAL_SMS_DEBOUNCE_MS) {
    return { ok: false, skipped: true, reason: "debounced" };
  }
  const url = `${site.url.replace(/\/$/, "")}/patient-portal`;
  const locale = patient.preferredLanguage === "es" ? "es" : "en";
  const res = await sendSms(patient.phoneNumber, portalMessageAlert(locale, url), "portal_message_alert");
  if (res.ok) {
    await db.patient.update({ where: { id: patientId }, data: { lastPortalSmsAt: new Date() } });
  }
  return res;
}
