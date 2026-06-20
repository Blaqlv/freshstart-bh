import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { requestAppointment, requestReschedule, cancelAppointment } from "./actions";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

const statusStyle: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  RESCHEDULE_REQUESTED: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-zinc-200 text-zinc-600",
  COMPLETED: "bg-brand-tint text-brand-dark",
};

function fmt(d: Date) {
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default async function AppointmentsPage() {
  const session = await requirePatient();
  const [appointments, locations, services] = await Promise.all([
    db.appointment.findMany({ where: { patientId: session.sub }, orderBy: { scheduledAt: "desc" } }),
    db.location.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    db.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Appointments</h1>
        <p className="text-sm text-ink-soft">
          Request a new appointment, or reschedule/cancel an existing one. Our team confirms each request.
        </p>
      </div>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="font-semibold text-brand-dark">Request an appointment</h2>
        <form action={requestAppointment} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-soft">Location</label>
            <select name="locationId" aria-label="Preferred location" className={input} defaultValue="">
              <option value="">No preference</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Service</label>
            <select name="serviceSlug" aria-label="Preferred service" className={input} defaultValue="">
              <option value="">No preference</option>
              {services.map((s) => (
                <option key={s.id} value={s.slug}>{s.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Preferred date &amp; time</label>
            <input name="scheduledAt" type="datetime-local" required aria-label="Appointment date and time" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ink-soft">Reason for visit (optional, kept private)</label>
            <textarea name="reason" rows={2} aria-label="Reason for visit (optional)" className={input} />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
              Request appointment
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-brand-dark">Your appointments</h2>
        {appointments.length === 0 && (
          <p className="rounded-card border border-line bg-white p-5 text-sm text-ink-soft">
            No appointments yet. Request one above.
          </p>
        )}
        {appointments.map((a) => {
          const active = a.status !== "CANCELLED" && a.status !== "COMPLETED";
          return (
            <div key={a.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-dark">{fmt(a.scheduledAt)}</p>
                  <p className="text-sm text-ink-soft">
                    {a.serviceName ?? "General"}{a.locationName ? ` · ${a.locationName}` : ""}
                  </p>
                </div>
                <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + (statusStyle[a.status] ?? "")}>
                  {a.status.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {active && (
                <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-line pt-4">
                  <form action={requestReschedule} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <div>
                      <label className="text-xs font-medium text-ink-soft">Reschedule to</label>
                      <input name="scheduledAt" type="datetime-local" required aria-label="Appointment date and time" className={input} />
                    </div>
                    <button className="rounded-full border border-brand-dark px-4 py-2 text-sm font-medium text-brand-dark hover:bg-brand-tint">
                      Request reschedule
                    </button>
                  </form>
                  <form action={cancelAppointment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white">
                      Cancel
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
