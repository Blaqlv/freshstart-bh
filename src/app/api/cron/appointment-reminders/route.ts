import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSmsToPatient } from "@/lib/sms";
import { appointmentReminder } from "@/lib/sms-templates";

/**
 * Appointment reminder cron (E2 step 1 — hourly, see vercel.json). Sends a
 * reminder ~24h before each upcoming appointment to patients with SMS consent.
 * The 1-hour selection window means each appointment matches exactly one run,
 * so no per-row "reminded" flag is needed. Guarded by CRON_SECRET.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now + 24 * 3_600_000);
  const windowEnd = new Date(now + 25 * 3_600_000);

  const appointments = await db.appointment.findMany({
    where: {
      status: { in: ["REQUESTED", "CONFIRMED"] },
      scheduledAt: { gte: windowStart, lt: windowEnd },
    },
    include: { patient: { select: { name: true } } },
  });

  let sent = 0;
  for (const appt of appointments) {
    const firstName = appt.patient.name.trim().split(/\s+/)[0] || appt.patient.name;
    const time = appt.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const res = await sendSmsToPatient(
      appt.patientId,
      (locale) => appointmentReminder(locale, firstName, appt.locationName ?? "your clinic", time),
      { templateName: "appointment_reminder", channel: "smsAppointmentReminders" },
    );
    if (res.ok) sent++;
  }

  return NextResponse.json({ ok: true, candidates: appointments.length, sent });
}
