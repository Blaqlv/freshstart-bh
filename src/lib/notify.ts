import "server-only";

/**
 * Transactional email via Resend's HTTP API (works on serverless; no SMTP
 * sockets). Used for staff notifications today; reusable for appointment
 * confirmations / password resets. Never include PHI in emails — callers pass
 * non-sensitive summaries only.
 *
 * Config: RESEND_API_KEY, EMAIL_FROM (verified sender), STAFF_NOTIFY_EMAIL
 * (where staff alerts go). If unset, falls back to a server-log line so dev and
 * unconfigured environments don't break.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Fresh Start Behavioral Health <onboarding@resend.dev>";

type EmailInput = { to: string | string[]; subject: string; text: string; html?: string };

export async function sendEmail({ to, subject, text, html }: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email:unconfigured] to=${Array.isArray(to) ? to.join(",") : to} subject="${subject}"`);
    return false;
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });
    if (!res.ok) {
      // Never throw — a failed notification must not break the user's action.
      console.error(`[email] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

/** Notify staff of an event (e.g. a new appointment request). PHI-free summary. */
export async function notifyStaff(subject: string, summary: string): Promise<void> {
  const to = process.env.STAFF_NOTIFY_EMAIL;
  if (!to) {
    console.info(`[notify] ${subject} — ${summary}`);
    return;
  }
  await sendEmail({ to, subject: `[Fresh Start] ${subject}`, text: summary });
}
