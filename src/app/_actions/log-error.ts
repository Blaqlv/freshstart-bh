"use server";

import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

/**
 * Logs a client-side error-boundary crash to the immutable audit log (A7).
 * Called from `error.tsx` boundaries, which are Client Components and cannot
 * write to the DB directly. We record route + message + digest only — never a
 * stack trace, which could leak internals into the audit trail / UI.
 */
export async function logClientError(input: {
  route: string;
  message: string;
  digest?: string;
}): Promise<void> {
  const actor = await getSession().catch(() => null);
  await audit(actor, "error.unhandled", "App", undefined, {
    route: input.route,
    message: input.message?.slice(0, 500) ?? "",
    digest: input.digest ?? null,
    at: new Date().toISOString(),
  });
}
