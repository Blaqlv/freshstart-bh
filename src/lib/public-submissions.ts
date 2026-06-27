import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/rate-limit";

/**
 * Public form submission audit log helpers (A2).
 *
 * Every public form writes an immutable, low-PHI PublicFormSubmission record:
 * the request IP is stored ONLY as a sha256 hash, and sensitive free-text fields
 * are redacted before the payload is persisted. This is separate from the
 * encrypted portal-facing FormSubmission queue.
 */

export const REDACTED = "[REDACTED - see secure channel]";

export async function requestContext(): Promise<{ ipHash: string; userAgent?: string }> {
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || "unknown";
  return { ipHash: hashIp(ip), userAgent: h.get("user-agent") ?? undefined };
}

export async function logPublicSubmission(input: {
  formType: string;
  ipHash: string;
  userAgent?: string;
  sessionId?: string;
  payload: Record<string, unknown>;
  status?: string;
}): Promise<void> {
  try {
    await db.publicFormSubmission.create({
      data: {
        formType: input.formType,
        ipHash: input.ipHash,
        userAgent: input.userAgent ?? null,
        sessionId: input.sessionId ?? null,
        payload: input.payload as object,
        status: input.status ?? "received",
      },
    });
  } catch (e) {
    // Never let the audit write break the user-facing submission.
    console.error("public submission log failed", e);
  }
}
