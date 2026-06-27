// src/lib/medicaid/cases.ts
import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import { getActiveTenantId } from "./tenant";
import { checklistFor } from "./checklist-templates";
import { MCO_NAMES } from "./mco";
import {
  isValidTransition,
  type CaseStatus,
  type CaseType,
  type McoStatus,
  type NewCaseInput,
} from "./constants";

type Actor = { sub: string; email: string };

export async function listCases(filter?: {
  status?: string;
  caseType?: string;
  assignedTo?: string;
}) {
  const tenantId = await getActiveTenantId();
  return db.medicaidEnrollmentCase.findMany({
    where: {
      tenantId,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.caseType ? { caseType: filter.caseType } : {}),
      ...(filter?.assignedTo ? { assignedTo: filter.assignedTo } : {}),
    },
    include: { checklistItems: { select: { isComplete: true } } },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getCase(caseId: string) {
  const tenantId = await getActiveTenantId();
  return db.medicaidEnrollmentCase.findFirst({
    where: { id: caseId, tenantId }, // tenant scope = cross-tenant access returns null
    include: {
      checklistItems: { orderBy: { stepNumber: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      mcoEnrollments: { orderBy: { mcoName: "asc" } },
      auditEntries: { orderBy: { performedAt: "desc" } },
    },
  });
}

export async function dashboardStats() {
  const tenantId = await getActiveTenantId();
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const [active, dueThisMonth, pendingSubmission, approvedThisYear] = await Promise.all([
    db.medicaidEnrollmentCase.count({ where: { tenantId, status: { in: ["not_started", "in_progress", "pending_info"] } } }),
    db.medicaidEnrollmentCase.count({ where: { tenantId, targetDeadline: { lte: monthEnd, gte: now }, status: { notIn: ["approved", "rejected"] } } }),
    db.medicaidEnrollmentCase.count({ where: { tenantId, status: "in_progress" } }),
    db.medicaidEnrollmentCase.count({ where: { tenantId, status: "approved", updatedAt: { gte: yearStart } } }),
  ]);
  return { active, dueThisMonth, pendingSubmission, approvedThisYear };
}

export async function createCase(actor: Actor, input: NewCaseInput): Promise<string> {
  const tenantId = await getActiveTenantId();
  const caseType = input.caseType as CaseType;
  const created = await db.medicaidEnrollmentCase.create({
    data: {
      tenantId,
      providerName: input.providerName,
      providerNpi: input.providerNpi,
      caseType,
      assignedTo: input.assignedTo || null,
      targetDeadline: input.targetDeadline ? new Date(input.targetDeadline) : null,
      status: "not_started",
      checklistItems: {
        create: checklistFor(caseType).map((t) => ({
          tenantId,
          stepNumber: t.stepNumber,
          title: t.title,
          description: t.description,
          isRequired: t.isRequired,
        })),
      },
      // Auto-seed the 7 MCO trackers only for initial enrollment.
      ...(caseType === "initial_enrollment"
        ? { mcoEnrollments: { create: MCO_NAMES.map((mcoName) => ({ tenantId, mcoName, status: "not_started" })) } }
        : {}),
    },
  });
  await writeCaseAudit(actor, tenantId, created.id, "case.created", `Case created (${caseType})`);
  return created.id;
}

export async function setCaseStatus(actor: Actor, caseId: string, to: CaseStatus): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId();
  const c = await db.medicaidEnrollmentCase.findFirst({ where: { id: caseId, tenantId } });
  if (!c) return { ok: false, error: "Case not found." };
  if (!isValidTransition(c.status as CaseStatus, to)) {
    return { ok: false, error: `Cannot move from ${c.status} to ${to}.` };
  }
  await db.medicaidEnrollmentCase.update({ where: { id: caseId }, data: { status: to } });
  await writeCaseAudit(actor, tenantId, caseId, "case.status", `${c.status} → ${to}`);

  if (to === "submitted") await notifyCaseSubmitted(c.providerName, c.assignedTo, caseId);
  if (to === "approved") await finalizeApprovedCase(actor, tenantId, caseId, c.providerName);
  return { ok: true };
}

export async function setChecklistItem(
  actor: Actor,
  itemId: string,
  patch: { isComplete?: boolean; notes?: string },
): Promise<void> {
  const tenantId = await getActiveTenantId();
  const item = await db.enrollmentChecklistItem.findFirst({ where: { id: itemId, tenantId } });
  if (!item) return;
  await db.enrollmentChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(patch.isComplete !== undefined
        ? { isComplete: patch.isComplete, completedAt: patch.isComplete ? new Date() : null, completedBy: patch.isComplete ? actor.sub : null }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  });
  if (patch.isComplete !== undefined) {
    await writeCaseAudit(actor, tenantId, item.caseId, "checklist.toggle", `Step ${item.stepNumber} ${patch.isComplete ? "completed" : "reopened"}`);
  }
}

export async function updateCaseFields(
  actor: Actor,
  caseId: string,
  patch: { notes?: string; assignedTo?: string | null; targetDeadline?: string | null; ohioMedicaidId?: string | null },
): Promise<void> {
  const tenantId = await getActiveTenantId();
  const c = await db.medicaidEnrollmentCase.findFirst({ where: { id: caseId, tenantId } });
  if (!c) return;
  await db.medicaidEnrollmentCase.update({
    where: { id: caseId },
    data: {
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo } : {}),
      ...(patch.ohioMedicaidId !== undefined ? { ohioMedicaidId: patch.ohioMedicaidId } : {}),
      ...(patch.targetDeadline !== undefined ? { targetDeadline: patch.targetDeadline ? new Date(patch.targetDeadline) : null } : {}),
    },
  });
  await writeCaseAudit(actor, tenantId, caseId, "case.update", "Case details updated");
}

export async function setMcoStatus(actor: Actor, mcoId: string, status: McoStatus, notes?: string): Promise<void> {
  const tenantId = await getActiveTenantId();
  const mco = await db.mcoEnrollment.findFirst({ where: { id: mcoId, tenantId } });
  if (!mco) return;
  await db.mcoEnrollment.update({
    where: { id: mcoId },
    data: {
      status,
      ...(notes !== undefined ? { notes } : {}),
      ...(status === "submitted" ? { submittedAt: new Date() } : {}),
      ...(status === "approved" ? { approvedAt: new Date() } : {}),
    },
  });
  await writeCaseAudit(actor, tenantId, mco.caseId, "mco.status", `${mco.mcoName}: ${status}`);
}

// ---- internal helpers ----

/** Write the per-case audit entry AND mirror to the global immutable AuditLog. */
async function writeCaseAudit(actor: Actor, tenantId: string, caseId: string, action: string, notes: string): Promise<void> {
  await db.enrollmentAuditEntry.create({ data: { tenantId, caseId, action, performedBy: actor.sub, notes } });
  await audit(actor, `enrollment.${action}`, "MedicaidEnrollmentCase", caseId, { notes });
}

async function adminEmails(): Promise<string[]> {
  const admins = await db.user.findMany({ where: { role: "ADMINISTRATOR", active: true }, select: { email: true } });
  return admins.map((a) => a.email);
}

async function notifyCaseSubmitted(providerName: string, assignedTo: string | null, caseId: string): Promise<void> {
  const recipients = new Set(await adminEmails());
  if (assignedTo) {
    const u = await db.user.findUnique({ where: { id: assignedTo }, select: { email: true } });
    if (u) recipients.add(u.email);
  }
  if (recipients.size === 0) return;
  await sendEmail({
    to: [...recipients],
    subject: `[Fresh Start] Medicaid case submitted — ${providerName}`,
    text: `The Medicaid enrollment case for ${providerName} was marked submitted. Review it in the admin portal (case ${caseId}).`,
  });
}

async function finalizeApprovedCase(actor: Actor, tenantId: string, caseId: string, providerName: string): Promise<void> {
  // Finalize: required checklist items complete; non-rejected documents accepted.
  await db.enrollmentChecklistItem.updateMany({
    where: { caseId, tenantId, isRequired: true, isComplete: false },
    data: { isComplete: true, completedAt: new Date(), completedBy: actor.sub },
  });
  await db.enrollmentDocument.updateMany({
    where: { caseId, tenantId, status: { not: "rejected" } },
    data: { status: "accepted" },
  });
  await writeCaseAudit(actor, tenantId, caseId, "case.approved", "Case approved; required items + documents finalized");
  const recipients = await adminEmails();
  if (recipients.length > 0) {
    await sendEmail({
      to: recipients,
      subject: `[Fresh Start] Medicaid case APPROVED — ${providerName}`,
      text: `Congratulations — the Medicaid enrollment case for ${providerName} is approved (case ${caseId}).`,
    });
  }
}
