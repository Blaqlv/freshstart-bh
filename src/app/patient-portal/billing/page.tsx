import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function detail(v: string | null): string | null {
  if (!v) return null;
  try {
    return decrypt(v);
  } catch {
    return null;
  }
}

export default async function BillingPage() {
  const session = await requirePatient();
  const statements = await db.billingStatement.findMany({
    where: { patientId: session.sub },
    orderBy: { issuedAt: "desc" },
  });
  if (statements.length) await audit(session, "patient.billing.view", "BillingStatement");

  const totalDue = statements
    .filter((s) => s.status === "DUE")
    .reduce((sum, s) => sum + s.amountCents, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Billing statements</h1>
        <p className="text-sm text-ink-soft">
          View your self-pay statements. Online payment is coming soon — to pay now, call your
          billing office or pay at your next visit.
        </p>
      </div>

      {totalDue > 0 && (
        <div className="rounded-card border border-brand bg-brand-tint p-5">
          <p className="text-sm text-brand-dark">Balance due</p>
          <p className="text-2xl font-bold text-brand-dark">{usd(totalDue)}</p>
        </div>
      )}

      {statements.length === 0 && (
        <p className="rounded-card border border-line bg-white p-5 text-sm text-ink-soft">No statements yet.</p>
      )}

      <ul className="space-y-3">
        {statements.map((s) => {
          const lines = detail(s.detailEncrypted);
          return (
            <li key={s.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-dark">{s.periodLabel}</p>
                  <p className="text-xs text-ink-soft">
                    Issued {s.issuedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {s.dueAt ? ` · due ${s.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                  </p>
                  {lines && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{lines}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand-dark">{usd(s.amountCents)}</p>
                  <span
                    className={
                      "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      (s.status === "PAID" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")
                    }
                  >
                    {s.status.toLowerCase()}
                  </span>
                  {s.status === "DUE" && (
                    <div className="mt-2">
                      <button
                        disabled
                        title="Online payment coming soon"
                        className="cursor-not-allowed rounded-full border border-line px-4 py-1.5 text-xs font-medium text-ink-soft"
                      >
                        Pay online (soon)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
