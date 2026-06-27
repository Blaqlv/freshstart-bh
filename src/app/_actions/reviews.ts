"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit, TOO_MANY_REQUESTS } from "@/lib/rate-limit";
import { logPublicSubmission, requestContext } from "@/lib/public-submissions";
import { HONEYPOT_FIELD } from "@/components/forms/HoneypotField";

export type ReviewState = { ok?: boolean; error?: string };

const reviewSchema = z.object({
  author: z.string().min(1, "Please enter your name").max(80),
  rating: z.coerce.number().int().min(1).max(5),
  quote: z.string().min(10, "Please share a little more").max(1500),
});

/**
 * On-site "Leave a Review" submission (A9). Writes a Testimonial with
 * moderation = PENDING — it never appears publicly until staff approve it.
 */
export async function submitReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const { ipHash, userAgent } = await requestContext();

  // Honeypot (A8): silently discard, log, fake success.
  const hp = fd.get(HONEYPOT_FIELD);
  if (typeof hp === "string" && hp.trim()) {
    await logPublicSubmission({ formType: "review", ipHash, userAgent, payload: { note: "honeypot" }, status: "honeypot_triggered" });
    return { ok: true };
  }

  // Rate limit: 2 / IP / day (A8).
  const rl = await checkRateLimit(ipHash, 2, "1d");
  if (!rl.ok) return { error: TOO_MANY_REQUESTS };

  const parsed = reviewSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;

  const t = await db.testimonial.create({
    data: {
      author: data.author,
      quote: data.quote,
      rating: data.rating,
      source: "Website",
      moderation: "PENDING",
      ipHash,
    },
  });
  await logPublicSubmission({
    formType: "review",
    ipHash,
    userAgent,
    payload: { testimonialId: t.id, rating: data.rating },
  });

  return { ok: true };
}
