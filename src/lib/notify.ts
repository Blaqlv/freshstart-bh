import "server-only";

/**
 * Transactional email/notification seam. Phase 4 logs to the server; a later
 * phase wires Resend/Postmark (RESEND_API_KEY) for staff notifications,
 * appointment confirmations, and password resets. Never include PHI in emails.
 */
export async function notifyStaff(subject: string, summary: string): Promise<void> {
  // TODO(email): send via Resend/Postmark when an API key is configured.
  console.info(`[notify] ${subject} — ${summary}`);
}
