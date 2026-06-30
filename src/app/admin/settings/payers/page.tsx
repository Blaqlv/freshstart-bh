// src/app/admin/settings/payers/page.tsx
import { requireCapability, requireModule } from "@/lib/auth";
import { listAllPayers } from "@/lib/insurance/payers";
import { EligibilitySandboxBanner } from "@/components/EligibilitySandboxBanner";
import { savePayerAction, addPayerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PayersSettings() {
  await requireModule("insurance_verification");
  await requireCapability("billing:manage");
  const payers = await listAllPayers();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">Payer codes</h1>
      <EligibilitySandboxBanner />
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr><th className="px-4 py-2">Payer</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Active</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {payers.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2" colSpan={3}>
                  <form action={savePayerAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="payerCode" defaultValue={p.payerCode} className="rounded-lg border border-line px-2 py-1" />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isActive" value="true" defaultChecked={p.isActive} /> active</label>
                    <button className="rounded-lg bg-brand-dark px-3 py-1 text-white">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-ink">Add payer</h2>
        <form action={addPayerAction} className="flex flex-wrap items-end gap-2 text-sm">
          <input name="name" placeholder="Payer name" required className="rounded-lg border border-line px-3 py-2" />
          <input name="payerCode" placeholder="Payer code" className="rounded-lg border border-line px-3 py-2" />
          <button className="rounded-lg bg-brand-dark px-4 py-2 font-medium text-white">Add</button>
        </form>
      </section>
    </div>
  );
}
