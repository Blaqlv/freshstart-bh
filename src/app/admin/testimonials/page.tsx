import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { createTestimonial, deleteTestimonial, toggleTestimonial } from "./actions";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

export default async function TestimonialsAdmin() {
  const session = await requireCapability("content:read");
  const canWrite = can(session.role, "testimonials:write");
  const items = await db.testimonial.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Testimonials</h1>
        <p className="text-sm text-ink-soft">Structured reviews shown in the testimonials block.</p>
      </div>

      {canWrite && (
        <form action={createTestimonial} className="grid gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ink-soft">Quote</label>
            <textarea name="quote" required rows={2} className={input} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Author</label>
            <input name="author" placeholder="e.g. A.M." className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-soft">Source</label>
              <input name="source" defaultValue="Google" className={input} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Rating</label>
              <input name="rating" type="number" min={1} max={5} defaultValue={5} className={input} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
              Add testimonial
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {items.map((t) => (
          <li key={t.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div aria-hidden className="text-gold">{"★".repeat(t.rating)}</div>
                <blockquote className="mt-1 text-sm text-ink-soft">&ldquo;{t.quote}&rdquo;</blockquote>
                <p className="mt-2 text-sm font-semibold text-brand-dark">{t.author} · {t.source}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={t.status} />
                {canWrite && (
                  <div className="flex gap-2">
                    <form action={toggleTestimonial}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs font-medium text-brand-dark hover:underline">
                        {t.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                    <form action={deleteTestimonial}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs font-medium text-accent hover:underline">Delete</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-ink-soft">No testimonials yet.</li>}
      </ul>
    </div>
  );
}
