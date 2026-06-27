import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCase } from "@/lib/medicaid/cases";
import { completionPercent, MCO_STATUSES, DOC_STATUSES, ALLOWED_TRANSITIONS } from "@/lib/medicaid/constants";
import { DocumentUploadForm } from "./DocumentUploadForm";
import {
  changeStatusAction, toggleChecklistAction,
  updateCaseAction, mcoStatusAction, reviewDocumentAction,
} from "./actions";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "documents", label: "Documents" },
  { id: "audit", label: "Audit Trail" },
] as const;

export default async function CaseDetail({
  params, searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireCapability("enrollment:read");
  const { caseId } = await params;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "overview";
  const c = await getCase(caseId);
  if (!c) notFound();
  const canManage = can(session.role, "enrollment:manage");
  const nextStatuses = ALLOWED_TRANSITIONS[c.status as keyof typeof ALLOWED_TRANSITIONS] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/medicaid-enrollment" className="text-sm text-accent hover:underline">← All cases</Link>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">{c.providerName}</h1>
        <p className="text-sm text-ink-soft">NPI {c.providerNpi} · {c.caseType} · <span className="font-medium">{c.status}</span></p>
      </div>

      {canManage && nextStatuses.length > 0 && (
        <form action={changeStatusAction} className="flex items-center gap-2 text-sm">
          <input type="hidden" name="caseId" value={c.id} />
          <select name="status" className="rounded-lg border border-line px-3 py-2">
            {nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand-dark px-3 py-2 font-medium text-white">Change status</button>
        </form>
      )}

      <nav className="flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/medicaid-enrollment/${c.id}?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={tab === t.id ? "border-b-2 border-brand-dark px-3 py-2 text-sm font-medium text-brand-dark" : "px-3 py-2 text-sm text-ink-soft"}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <Overview c={c} canManage={canManage} />}
      {tab === "checklist" && <Checklist c={c} canManage={canManage} />}
      {tab === "documents" && <Documents c={c} canManage={canManage} />}
      {tab === "audit" && <AuditTab c={c} />}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Overview({ c, canManage }: { c: any; canManage: boolean }) {
  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-ink">Case details</h2>
        {canManage ? (
          <form action={updateCaseAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={c.id} />
            <label className="text-sm">Assigned to (User id)
              <input name="assignedTo" defaultValue={c.assignedTo ?? ""} className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
            <label className="text-sm">Target deadline
              <input type="date" name="targetDeadline" defaultValue={c.targetDeadline ? new Date(c.targetDeadline).toISOString().slice(0,10) : ""} className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
            <label className="text-sm">Ohio Medicaid ID
              <input name="ohioMedicaidId" defaultValue={c.ohioMedicaidId ?? ""} className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
            <label className="text-sm sm:col-span-2">Notes
              <textarea name="notes" defaultValue={c.notes ?? ""} className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
            <div className="sm:col-span-2"><button className="rounded-lg bg-brand-dark px-3 py-2 text-sm font-medium text-white">Save</button></div>
          </form>
        ) : (
          <dl className="text-sm text-ink">
            <div>Assigned to: {c.assignedTo ?? "—"}</div>
            <div>Deadline: {c.targetDeadline ? new Date(c.targetDeadline).toLocaleDateString() : "—"}</div>
            <div>Ohio Medicaid ID: {c.ohioMedicaidId ?? "—"}</div>
            <div>Notes: {c.notes ?? "—"}</div>
          </dl>
        )}
      </section>

      {c.mcoEnrollments.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">MCO enrollment</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.mcoEnrollments.map((m: any) => (
              <div key={m.id} className="rounded-card border border-line bg-white p-4">
                <div className="font-medium text-ink">{m.mcoName}</div>
                <div className="text-xs text-ink-soft">{m.status}</div>
                {canManage && (
                  <form action={mcoStatusAction} className="mt-2 flex flex-wrap gap-2 text-sm">
                    <input type="hidden" name="caseId" value={c.id} />
                    <input type="hidden" name="mcoId" value={m.id} />
                    <select name="status" defaultValue={m.status} className="rounded-lg border border-line px-2 py-1">
                      {MCO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input name="notes" defaultValue={m.notes ?? ""} placeholder="notes" className="flex-1 rounded-lg border border-line px-2 py-1" />
                    <button className="rounded-lg bg-brand-dark px-2 py-1 text-white">Save</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Checklist({ c, canManage }: { c: any; canManage: boolean }) {
  const pct = completionPercent(c.checklistItems);
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-sm text-ink-soft">{c.checklistItems.filter((i: any) => i.isComplete).length} of {c.checklistItems.length} steps complete</div>
        <div className="h-2 w-full rounded-full bg-surface-alt"><div className="h-2 rounded-full bg-brand-dark" style={{ width: `${pct}%` }} /></div>
      </div>
      <p className="text-xs text-ink-soft">Review this checklist with your Medicaid enrollment specialist before using it on real cases — ODM updates requirements periodically.</p>
      <ul className="space-y-2">
        {c.checklistItems.map((it: any) => (
          <li key={it.id} className="rounded-card border border-line bg-white p-3">
            <div className="flex items-start gap-3">
              {canManage ? (
                <form action={toggleChecklistAction}>
                  <input type="hidden" name="caseId" value={c.id} />
                  <input type="hidden" name="itemId" value={it.id} />
                  <input type="hidden" name="complete" value={(!it.isComplete).toString()} />
                  <button className={it.isComplete ? "text-brand-dark" : "text-ink-soft"} aria-label="Toggle complete">{it.isComplete ? "☑" : "☐"}</button>
                </form>
              ) : (<span>{it.isComplete ? "☑" : "☐"}</span>)}
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">{it.stepNumber}. {it.title} {it.isRequired ? <span className="text-xs text-accent">(required)</span> : <span className="text-xs text-ink-soft">(optional)</span>}</div>
                <div className="text-xs text-ink-soft">{it.description}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Documents({ c, canManage }: { c: any; canManage: boolean }) {
  return (
    <div className="space-y-4">
      {canManage && <DocumentUploadForm caseId={c.id} />}
      <ul className="space-y-2">
        {c.documents.map((d: any) => (
          <li key={d.id} className="rounded-card border border-line bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-ink">{d.documentType}</span> — {" "}
                <a href={`/admin/medicaid-enrollment/${c.id}/document/${d.id}`} className="text-accent hover:underline">{d.fileName}</a>
                <span className="ml-2 text-xs text-ink-soft">{d.status} · {new Date(d.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            {canManage && (
              <form action={reviewDocumentAction} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="caseId" value={c.id} />
                <input type="hidden" name="docId" value={d.id} />
                <select name="status" defaultValue={d.status} className="rounded-lg border border-line px-2 py-1">
                  {DOC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input name="note" defaultValue={d.reviewNote ?? ""} placeholder="review note" className="flex-1 rounded-lg border border-line px-2 py-1" />
                <button className="rounded-lg bg-brand-dark px-2 py-1 text-white">Save</button>
              </form>
            )}
          </li>
        ))}
        {c.documents.length === 0 && <li className="text-sm text-ink-soft">No documents uploaded.</li>}
      </ul>
    </div>
  );
}

function AuditTab({ c }: { c: any }) {
  return (
    <ul className="space-y-2">
      {c.auditEntries.map((e: any) => (
        <li key={e.id} className="rounded-card border border-line bg-white p-3 text-sm">
          <span className="font-medium text-ink">{e.action}</span>
          <span className="text-ink-soft"> — {e.notes}</span>
          <div className="text-xs text-ink-soft">{new Date(e.performedAt).toLocaleString()} · {e.performedBy}</div>
        </li>
      ))}
      {c.auditEntries.length === 0 && <li className="text-sm text-ink-soft">No activity yet.</li>}
    </ul>
  );
}
