import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { ReviewForm } from "@/components/forms/ReviewForm";

export const metadata: Metadata = {
  title: "Leave a Review",
  description: "Share your experience with Fresh Start Behavioral Health.",
};

export default function LeaveAReviewPage() {
  return (
    <Container className="py-16">
      <h1 className="text-3xl font-bold text-brand-dark">Leave a Review</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Your feedback helps others find the care they need. Share your experience below, or leave us
        a review on Google.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 max-w-xl">
          <ReviewForm />
        </div>
        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-surface-alt p-6">
            <h2 className="font-semibold text-brand-dark">Prefer Google?</h2>
            <a
              href={site.google}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Review us on Google
            </a>
          </div>
        </aside>
      </div>
    </Container>
  );
}
