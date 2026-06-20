import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { replyToThread } from "../actions";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePatient();

  const thread = await db.messageThread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread || thread.patientId !== session.sub) notFound();

  // Mark staff messages as read, and audit this PHI access (message bodies are decrypted below).
  await db.portalMessage.updateMany({
    where: { threadId: id, sender: "STAFF", readAt: null },
    data: { readAt: new Date() },
  });
  await audit(session, "patient.message.view", "MessageThread", id);

  const messages = thread.messages.map((m) => ({
    ...m,
    body: safeDecrypt(m.bodyEncrypted),
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/patient-portal/messages" className="text-sm text-accent hover:underline">
          ← All messages
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-dark">{thread.subject}</h1>
      </div>

      <ul className="space-y-3">
        {messages.map((m) => {
          const mine = m.sender === "PATIENT";
          return (
            <li
              key={m.id}
              className={
                "max-w-[85%] rounded-card border p-4 " +
                (mine ? "ml-auto border-brand bg-brand-tint" : "border-line bg-white")
              }
            >
              <p className="text-xs font-medium text-ink-soft">
                {m.senderName} · {m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{m.body}</p>
            </li>
          );
        })}
      </ul>

      {thread.status === "OPEN" ? (
        <form action={replyToThread} className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="threadId" value={thread.id} />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Write a reply…"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
            Send reply
          </button>
        </form>
      ) : (
        <p className="border-t border-line pt-4 text-sm text-ink-soft">This conversation is closed.</p>
      )}
    </div>
  );
}

function safeDecrypt(payload: string): string {
  try {
    return decrypt(payload);
  } catch {
    return "[unable to decrypt message]";
  }
}
