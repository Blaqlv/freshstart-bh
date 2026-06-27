import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { approveReview, editAndApproveReview, rejectReview } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Review moderation queue (A9). Administrator + Clinical Director. Pending
 * submissions can be approved, rejected with an internal reason, or edited and
 * approved (the original text is preserved in the audit log).
 */
export default async function ReviewModeration() {
  const session = await requireSession();
  if (session.role !== "ADMINISTRATOR" && session.role !== "CLINICAL_DIRECTOR") {
    redirect("/forbidden");
  }

  const pending = await db.testimonial.findMany({
    where: { moderation: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Review moderation</h1>
        <p className="text-sm text-ink-soft">
          Patient-submitted reviews awaiting approval. Nothing here is visible on the public site
          until you approve it.
        </p>
      </div>

      {pending.length === 0 && (
        <p className="rounded-card border border-line bg-white p-6 text-sm text-ink-soft">
          No reviews are awaiting moderation.
        </p>
      )}

      <ul className="space-y-4">
        {pending.map((t) => (
          <li key={t.id} className="rounded-card border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-brand-dark">{t.author}</span>
                <span className="ml-2 text-gold" aria-label={`${t.rating} stars`}>
                  {"★".repeat(t.rating)}
                </span>
              </div>
              <span className="text-xs text-ink-soft">{t.createdAt.toLocaleDateString()}</span>
            </div>

            {/* Edit & Approve: editable body, defaulting to the submitted text. */}
            <form action={editAndApproveReview.bind(null, t.id)} className="mt-3">
              <textarea
                name="quote"
                defaultValue={t.quote}
                rows={3}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-tint"
                >
                  Edit &amp; Approve
                </button>
              </div>
            </form>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              <form action={approveReview.bind(null, t.id)}>
                <button
                  type="submit"
                  className="rounded-lg bg-green-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                >
                  Approve
                </button>
              </form>
              <form action={rejectReview.bind(null, t.id)} className="flex items-end gap-2">
                <label className="text-xs text-ink-soft">
                  Rejection reason (internal)
                  <input
                    name="reason"
                    className="mt-1 block w-64 rounded-lg border border-line px-2 py-1 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-accent px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white"
                >
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
