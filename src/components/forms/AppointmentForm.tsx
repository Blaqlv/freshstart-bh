"use client";

import { useState } from "react";
import { NO_PHI_NOTICE } from "@/lib/site";

type Option = { value: string; label: string };

const field = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";
const labelCls = "block text-sm font-medium text-ink";

/**
 * Appointment Request form (Brief §8.1). No clinical information is collected.
 * Phase 3 renders the UI + required no-PHI notice; Phase 4 wires secure,
 * audited submission to the admin queue.
 */
export function AppointmentForm({
  locations,
  services,
}: {
  locations: Option[];
  services: Option[];
}) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div role="status" className="rounded-card border border-brand bg-brand-tint p-6">
        <h3 className="font-semibold text-brand-dark">Thank you — we&rsquo;ll be in touch.</h3>
        <p className="mt-2 text-sm text-ink-soft">
          A team member will contact you using your preferred method. For urgent needs, please
          call <a href="tel:+19375790073" className="font-semibold text-brand-dark">937-579-0073</a>.
        </p>
      </div>
    );
  }

  return (
    <form
      id="appointment"
      onSubmit={(e) => {
        e.preventDefault();
        // Phase 4: POST to a secure, audited server action / admin queue.
        setSubmitted(true);
      }}
      className="space-y-4"
    >
      <div
        role="note"
        className="rounded-lg border-l-4 border-accent bg-accent/5 px-4 py-3 text-sm text-ink"
      >
        {NO_PHI_NOTICE}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Full name</span>
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Phone</span>
          <input name="phone" type="tel" required autoComplete="tel" className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Preferred contact method</span>
          <select name="contactMethod" className={field} defaultValue="phone">
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="text">Text message</option>
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Preferred location</span>
          <select name="location" className={field} defaultValue="">
            <option value="" disabled>Select a location</option>
            {locations.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Preferred service</span>
          <select name="service" className={field} defaultValue="">
            <option value="" disabled>Select a service</option>
            {services.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          I consent to be contacted by Fresh Start Behavioral Health about my request. I understand
          not to include medical or confidential health information in this form.
        </span>
      </label>

      <button
        type="submit"
        className="rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
      >
        Request Appointment
      </button>
    </form>
  );
}
