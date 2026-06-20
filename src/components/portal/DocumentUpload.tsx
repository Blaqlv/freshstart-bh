"use client";

import { useActionState, useRef, useEffect } from "react";
import { uploadDocument, type UploadState } from "@/app/patient-portal/documents/actions";

export function DocumentUpload() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadDocument, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3">
      <input
        type="file"
        name="file"
        aria-label="Document to upload"
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        required
        className="block w-full text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-dark"
      />
      <p className="text-xs text-ink-soft">Accepted: PDF, JPG, PNG, DOCX · up to 15MB.</p>
      {state.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-brand-dark">Uploaded. It will be scanned before your care team can open it.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}
