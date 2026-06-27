import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { updateCommunicationPreferences } from "./actions";

export const dynamic = "force-dynamic";

const toggle = "h-5 w-5 shrink-0";

/**
 * Communication Preferences (A5 / E6). SMS consent + per-channel notification
 * toggles. SMS sending itself is delivered in v1.4 (Telnyx); this captures the
 * preferences cleanly in advance.
 */
export default async function PortalSettingsPage() {
  const session = await requirePatient();
  const patient = await db.patient.findUnique({ where: { id: session.sub } });
  if (!patient) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Communication preferences</h1>
        <p className="text-sm text-ink-soft">
          Choose how Fresh Start contacts you. You can change these at any time. Reply STOP to any
          text message to unsubscribe.
        </p>
      </div>

      <form action={updateCommunicationPreferences} className="space-y-6 rounded-card border border-line bg-white p-6">
        <label className="block">
          <span className="text-sm font-medium text-ink">Mobile phone for text messages</span>
          <input
            name="phoneNumber"
            type="tel"
            defaultValue={patient.phoneNumber ?? ""}
            autoComplete="tel"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-start gap-3">
          <input type="checkbox" name="smsConsentGiven" defaultChecked={patient.smsConsentGiven} className={toggle} />
          <span className="text-sm text-ink">
            I consent to receive text messages from Fresh Start Behavioral Health. Message and data
            rates may apply.
          </span>
        </label>

        <fieldset className="space-y-3 border-t border-line pt-4">
          <legend className="text-sm font-semibold text-brand-dark">Text message (SMS)</legend>
          <Row name="smsAppointmentReminders" label="Appointment reminders" checked={patient.smsAppointmentReminders} />
          <Row name="smsPortalAlerts" label="New secure message alerts" checked={patient.smsPortalAlerts} />
        </fieldset>

        <fieldset className="space-y-3 border-t border-line pt-4">
          <legend className="text-sm font-semibold text-brand-dark">Email</legend>
          <Row name="emailAppointmentReminders" label="Appointment reminders" checked={patient.emailAppointmentReminders} />
          <Row name="emailPortalAlerts" label="New secure message alerts" checked={patient.emailPortalAlerts} />
        </fieldset>

        <button
          type="submit"
          className="rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Save preferences
        </button>
      </form>
    </div>
  );
}

function Row({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={checked} className={toggle} />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}
