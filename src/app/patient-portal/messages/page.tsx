import Link from "next/link";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { startThread } from "./actions";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";

export default async function MessagesPage() {
  const session = await requirePatient();
  const threads = await db.messageThread.findMany({
    where: { patientId: session.sub },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { messages: { where: { sender: "STAFF", readAt: null } } },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Secure messages</h1>
        <p className="text-sm text-ink-soft">
          Message your care team securely. Messages are encrypted. For emergencies, call 911 or 988.
        </p>
      </div>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="font-semibold text-brand-dark">New message</h2>
        <form action={startThread} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-soft">Subject</label>
            <input name="subject" required aria-label="Subject" className={input} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Message</label>
            <textarea name="body" required rows={3} aria-label="Message" className={input} />
          </div>
          <button className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
            Send message
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-brand-dark">Conversations</h2>
        {threads.length === 0 && (
          <p className="rounded-card border border-line bg-white p-5 text-sm text-ink-soft">No messages yet.</p>
        )}
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/patient-portal/messages/${t.id}`}
                className="flex items-center justify-between rounded-card border border-line bg-white p-4 hover:border-brand-dark"
              >
                <div>
                  <p className="font-medium text-brand-dark">{t.subject}</p>
                  <p className="text-xs text-ink-soft">
                    Updated {t.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {t.status === "CLOSED" ? " · closed" : ""}
                  </p>
                </div>
                {t._count.messages > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                    {t._count.messages} new
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
