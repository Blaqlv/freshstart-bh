import { db } from "@/lib/db";
import { requireCapability, requireModule } from "@/lib/auth";
import { updateForm } from "./actions";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

export default async function FormsAdmin() {
  await requireModule("appointment_requests");
  await requireCapability("forms:manage");
  const forms = await db.formDefinition.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Form management</h1>
        <p className="text-sm text-ink-soft">
          Rename a form or take it offline without a redeploy. Submissions land in the{" "}
          <span className="font-medium">Form submissions</span> queue.
        </p>
      </div>

      {forms.length === 0 && (
        <p className="rounded-card border border-line bg-white p-6 text-sm text-ink-soft">
          No forms defined yet. Seed the database (<code>npm run db:seed</code>) to create the
          appointment-request and insurance-verification definitions.
        </p>
      )}

      <ul className="space-y-3">
        {forms.map((f) => (
          <li key={f.id} className="rounded-card border border-line bg-white p-4">
            <form action={updateForm} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={f.id} />
              <div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-ink-soft">{f.key}</code>
                  <span
                    className={
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      (f.active ? "bg-green-100 text-green-800" : "bg-zinc-200 text-zinc-700")
                    }
                  >
                    {f.active ? "Live" : "Offline"}
                  </span>
                </div>
                <label className="mt-2 block text-xs font-medium text-ink-soft">Display name</label>
                <input name="name" defaultValue={f.name} className={input} />
                <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="active" defaultChecked={f.active} />
                  Accept new submissions
                </label>
              </div>
              <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
