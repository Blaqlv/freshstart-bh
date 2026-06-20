"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function createTestimonial(formData: FormData) {
  const s = await requireCapability("testimonials:write");
  const t = await db.testimonial.create({
    data: {
      quote: String(formData.get("quote") ?? "").trim(),
      author: String(formData.get("author") ?? "").trim() || "Anonymous",
      source: String(formData.get("source") ?? "Google").trim(),
      rating: Math.min(5, Math.max(1, Number(formData.get("rating") ?? 5))),
      status: "PUBLISHED",
    },
  });
  await audit({ sub: s.sub, email: s.email }, "testimonial.create", "Testimonial", t.id);
  revalidatePath("/admin/testimonials");
}

export async function toggleTestimonial(formData: FormData) {
  const s = await requireCapability("testimonials:write");
  const id = String(formData.get("id"));
  const cur = await db.testimonial.findUnique({ where: { id } });
  if (!cur) return;
  const status = cur.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  await db.testimonial.update({ where: { id }, data: { status } });
  await audit({ sub: s.sub, email: s.email }, "testimonial.status", "Testimonial", id, { status });
  revalidatePath("/admin/testimonials");
}

export async function deleteTestimonial(formData: FormData) {
  const s = await requireCapability("testimonials:write");
  const id = String(formData.get("id"));
  await db.testimonial.delete({ where: { id } });
  await audit({ sub: s.sub, email: s.email }, "testimonial.delete", "Testimonial", id);
  revalidatePath("/admin/testimonials");
}
