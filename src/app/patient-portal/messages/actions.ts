"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";

export async function startThread(formData: FormData) {
  const session = await requirePatient();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) return;

  const thread = await db.messageThread.create({
    data: {
      patientId: session.sub,
      subject,
      messages: {
        create: { sender: "PATIENT", senderName: session.name, bodyEncrypted: encrypt(body) },
      },
    },
  });
  await audit(session, "patient.message.start", "MessageThread", thread.id);
  redirect(`/patient-portal/messages/${thread.id}`);
}

export async function replyToThread(formData: FormData) {
  const session = await requirePatient();
  const threadId = String(formData.get("threadId"));
  const body = String(formData.get("body") ?? "").trim();

  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.patientId !== session.sub) throw new Error("FORBIDDEN");
  if (!body) return;

  await db.portalMessage.create({
    data: { threadId, sender: "PATIENT", senderName: session.name, bodyEncrypted: encrypt(body) },
  });
  await db.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
  await audit(session, "patient.message.reply", "MessageThread", threadId);
  revalidatePath(`/patient-portal/messages/${threadId}`);
}
