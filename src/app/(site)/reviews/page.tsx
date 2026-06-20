import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Read what patients say about Fresh Start Behavioral Health.",
};

export default async function ReviewsPage() {
  const items = await db.testimonial.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Reviews</h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-gold">{site.rating.value}</span>
            <span className="text-white/85">
              average from {site.rating.count} {site.rating.source} reviews
            </span>
          </div>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-6 md:grid-cols-2">
          {items.map((t) => (
            <li key={t.id} className="rounded-card border border-line bg-white p-6">
              <div aria-hidden className="text-gold">{"★".repeat(t.rating)}</div>
              <blockquote className="mt-3 text-ink-soft">&ldquo;{t.quote}&rdquo;</blockquote>
              <p className="mt-4 text-sm font-semibold text-brand-dark">{t.author} · {t.source}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button href="/reviews/leave-a-review">Leave a Review</Button>
        </div>
      </Container>
    </>
  );
}
