import { isSandbox } from "@/lib/fhir/config";

/** Renders nothing in production. In sandbox mode shows the mandated warning. */
export function EhrSandboxBanner() {
  if (!isSandbox()) return null;
  return (
    <div
      role="status"
      className="mb-4 rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <strong>SANDBOX mode.</strong> EHR integration is running in SANDBOX mode. No real
      patient data is being accessed. Contact your compliance officer before switching to
      production credentials.
    </div>
  );
}
