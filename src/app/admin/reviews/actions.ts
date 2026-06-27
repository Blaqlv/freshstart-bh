"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession, type Session } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyStaff } from "@/lib/notify";

// A9: review moderation is limited to Administrator + Clinical Director.
async function requireModerator(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "ADMINISTRATOR" && session.role !== "CLINICAL_DIRECTOR") {
    redirect("/forbidden");
  }
  return session;
}

export async function approveReview(id: string): Promise<void> {
  const session = await requireModerator();
  await db.testimonial.update({
    where: { id },
    data: { moderation: "APPROVED", moderatedById: session.sub, moderatedAt: new Date() },
  });
  await audit(session, "testimonial.approve", "Testimonial", id);
  // Notify administrators that new public content has gone live (A9 step 5).
  await notifyStaff("Review approved & published", `A patient review (id ${id}) is now live on /reviews.`);
  revalidatePath("/admin/reviews");
}

export async function rejectReview(id: string, formData: FormData): Promise<void> {
  const session = await requireModerator();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await db.testimonial.update({
    where: { id },
    data: { moderation: "REJECTED", rejectionReason: reason, moderatedById: session.sub, moderatedAt: new Date() },
  });
  // Reason is stored internally only — never shown to the submitter (A9 step 4).
  await audit(session, "testimonial.reject", "Testimonial", id, { reason });
  revalidatePath("/admin/reviews");
}

export async function editAndApproveReview(id: string, formData: FormData): Promise<void> {
  const session = await requireModerator();
  const edited = String(formData.get("quote") ?? "").trim();
  if (!edited) return;
  const current = await db.testimonial.findUnique({ where: { id }, select: { quote: true, originalQuote: true } });
  if (!current) return;

  await db.testimonial.update({
    where: { id },
    data: {
      quote: edited,
      // Preserve the very first original on the first edit only.
      originalQuote: current.originalQuote ?? current.quote,
      moderation: "APPROVED",
      moderatedById: session.sub,
      moderatedAt: new Date(),
    },
  });
  await audit(session, "testimonial.editApprove", "Testimonial", id, {
    original: current.originalQuote ?? current.quote,
    edited,
  });
  await notifyStaff("Review edited, approved & published", `A patient review (id ${id}) was edited and is now live.`);
  revalidatePath("/admin/reviews");
}
