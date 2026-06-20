import "server-only";
import { db } from "@/lib/db";
import type { Session } from "@/lib/auth";

/**
 * Append-only audit logging. The app never updates or deletes AuditLog rows.
 * (DB-level immutability — REVOKE UPDATE/DELETE — is added in the security phase.)
 */
export async function audit(
  actor: Pick<Session, "sub" | "email"> | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.sub ?? null,
        actorEmail: actor?.email ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch (e) {
    // Never let audit failure break the user action; surface in logs.
    console.error("audit log failed", e);
  }
}
