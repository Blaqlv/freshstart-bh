import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { requestRefill } from "./actions";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

const statusStyle: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-brand-tint text-brand-dark",
  APPROVED: "bg-green-100 text-green-800",
  DENIED: "bg-red-100 text-red-800",
};

function dec(v: string | null) {
  if (!v) return null;
  try {
    return decrypt(v);
  } catch {
    return "[unable to decrypt]";
  }
}

export default async function RefillsPage() {
  const session = await requirePatient();
  const refills = await db.refillRequest.findMany({
    where: { patientId: session.sub },
    orderBy: { createdAt: "desc" },
  });
  // Listing decrypts medication names (PHI), so record the access.
  if (refills.length) await audit(session, "patient.refill.view", "RefillRequest");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Prescription refills</h1>
        <p className="text-sm text-ink-soft">
          Request a refill from your care team. Requests are reviewed by a provider before approval —
          this is not a guarantee of refill.
        </p>
      </div>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="font-semibold text-brand-dark">Request a refill</h2>
        <form action={requestRefill} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-soft">Medication</label>
            <input name="medication" required className={input} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Preferred pharmacy (optional)</label>
            <input name="pharmacy" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ink-soft">Notes for your provider (optional)</label>
            <textarea name="notes" rows={2} className={input} />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
              Submit request
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-brand-dark">Your requests</h2>
        {refills.length === 0 && (
          <p className="rounded-card border border-line bg-white p-5 text-sm text-ink-soft">No refill requests yet.</p>
        )}
        <ul className="space-y-2">
          {refills.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-card border border-line bg-white p-4">
              <div>
                <p className="font-medium text-brand-dark">{dec(r.medicationEncrypted)}</p>
                {dec(r.pharmacyEncrypted) && (
                  <p className="text-xs text-ink-soft">Pharmacy: {dec(r.pharmacyEncrypted)}</p>
                )}
                <p className="text-xs text-ink-soft">
                  Requested {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " + (statusStyle[r.status] ?? "")}>
                {r.status.replace(/_/g, " ").toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
