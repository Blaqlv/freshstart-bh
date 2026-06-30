import { db } from "@/lib/db";
import { requireCapability, requireModule } from "@/lib/auth";
import type { TranslationStatus } from "@prisma/client";
import { setTranslationStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<TranslationStatus, { label: string; dot: string }> = {
  NOT_STARTED: { label: "Not started", dot: "bg-gray-400" },
  IN_PROGRESS: { label: "In progress", dot: "bg-amber-500" },
  NEEDS_REVIEW: { label: "Needs review", dot: "bg-blue-500" },
  APPROVED: { label: "Approved", dot: "bg-green-600" },
};

const ORDER: TranslationStatus[] = ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVIEW", "APPROVED"];

/**
 * Spanish translations dashboard (D3). Traffic-light grid of every CMS page and
 * its Spanish translation status. Administrator + Clinical Director only.
 */
export default async function TranslationsDashboard() {
  await requireModule("multilingual");
  await requireCapability("content:publish");
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });

  const counts = ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: pages.filter((p) => p.translationStatus === s).length }),
    {} as Record<TranslationStatus, number>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Translations</h1>
        <p className="text-sm text-ink-soft">
          Spanish (ES) translation progress per page. Machine-assisted strings must be reviewed by
          bilingual clinical staff before approval.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}: <strong>{counts[s]}</strong>
          </span>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-soft">
            <th className="py-2">Page</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Status</th>
            <th className="py-2">Update</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id} className="border-b border-line/60">
              <td className="py-2 font-medium text-ink">{p.title}</td>
              <td className="py-2 text-ink-soft">/{p.slug}</td>
              <td className="py-2">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[p.translationStatus].dot}`} />
                  {STATUS_META[p.translationStatus].label}
                </span>
              </td>
              <td className="py-2">
                <form action={setTranslationStatus.bind(null, p.id)}>
                  <select
                    name="status"
                    defaultValue={p.translationStatus}
                    className="rounded-lg border border-line px-2 py-1 text-sm"
                    // Submit on change via the formaction button below.
                  >
                    {ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="ml-2 rounded-lg bg-brand-dark px-3 py-1 text-xs font-semibold text-white hover:bg-brand-hover"
                  >
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
