import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";
import { startConfirmation, stopConfirmation, unmonitoredReply } from "@/lib/sms-templates";

/**
 * Telnyx inbound SMS webhook (E5) — STOP/START keyword handling, mandatory for
 * legal compliance. Matches the sender's number to a Patient / IntakeSubmission
 * and toggles smsConsentGiven, then auto-replies.
 *
 * Note: add Telnyx Ed25519 signature verification (telnyx-signature-ed25519 +
 * TELNYX_PUBLIC_KEY) before production; kept out here to stay env-guard-simple.
 */
export const dynamic = "force-dynamic";

const STOP = new Set(["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT", "END"]);
const START = new Set(["START", "UNSTOP"]);

function last10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = (body as { data?: { payload?: Record<string, unknown> } })?.data?.payload;
  const from = (payload?.from as { phone_number?: string } | undefined)?.phone_number ?? "";
  const text = String(payload?.text ?? "").trim();
  if (!from || !text) return NextResponse.json({ ok: true });

  const keyword = text.toUpperCase();
  const fromDigits = last10(from);

  // Match by last 10 digits across patients + intakes.
  const [patients, intakes] = await Promise.all([
    db.patient.findMany({ where: { phoneNumber: { not: null } } }),
    db.intakeSubmission.findMany({ where: { phoneNumber: { not: null } } }),
  ]);
  const matchedPatients = patients.filter((p) => p.phoneNumber && last10(p.phoneNumber) === fromDigits);
  const matchedIntakes = intakes.filter((i) => i.phoneNumber && last10(i.phoneNumber) === fromDigits);
  const locale =
    matchedPatients[0]?.preferredLanguage === "es" || matchedIntakes[0]?.preferredLanguage === "es"
      ? "es"
      : "en";

  if (STOP.has(keyword)) {
    await Promise.all([
      ...matchedPatients.map((p) =>
        db.patient.update({ where: { id: p.id }, data: { smsConsentGiven: false } }),
      ),
      ...matchedIntakes.map((i) =>
        db.intakeSubmission.update({ where: { id: i.id }, data: { smsConsentGiven: false } }),
      ),
    ]);
    await audit(null, "sms.optout", "Sms", undefined, { fromDigits, keyword });
    await sendSms(from, stopConfirmation(locale), "stop_confirmation");
    return NextResponse.json({ ok: true, action: "stop" });
  }

  if (START.has(keyword)) {
    // Re-enable only where a record already exists (previously opted in, then out).
    await Promise.all([
      ...matchedPatients.map((p) =>
        db.patient.update({ where: { id: p.id }, data: { smsConsentGiven: true } }),
      ),
      ...matchedIntakes.map((i) =>
        db.intakeSubmission.update({ where: { id: i.id }, data: { smsConsentGiven: true } }),
      ),
    ]);
    await audit(null, "sms.optin", "Sms", undefined, { fromDigits, keyword });
    await sendSms(from, startConfirmation(locale), "start_confirmation");
    return NextResponse.json({ ok: true, action: "start" });
  }

  // Any other inbound message → not monitored.
  await sendSms(from, unmonitoredReply(locale), "unmonitored_reply");
  return NextResponse.json({ ok: true, action: "auto_reply" });
}
