import { isSandbox } from "@/lib/eligibility/config";

export function EligibilitySandboxBanner() {
  if (!isSandbox()) return null;
  return (
    <div role="status" className="mb-4 rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>SANDBOX mode.</strong> Eligibility checks are returning synthetic data. No real payer
      API is being called. Contact your compliance officer before switching to production credentials.
    </div>
  );
}
