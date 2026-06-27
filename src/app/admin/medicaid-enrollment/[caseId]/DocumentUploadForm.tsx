"use client";
import { useActionState, useRef, useEffect } from "react";
import { uploadDocumentAction, type UploadDocState } from "./actions";
import { DOC_TYPES } from "@/lib/medicaid/constants";

export function DocumentUploadForm({ caseId }: { caseId: string }) {
  const [state, action, pending] = useActionState<UploadDocState, FormData>(uploadDocumentAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-card border border-line bg-white p-4">
      <input type="hidden" name="caseId" value={caseId} />
      <select name="documentType" className="rounded-lg border border-line px-3 py-2 text-sm">
        {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.docx" required className="block w-full text-sm" />
      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-brand-dark">Uploaded.</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}
