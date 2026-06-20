import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Leave a Review",
  description: "Share your experience with Fresh Start Behavioral Health.",
};

export default function LeaveAReviewPage() {
  return (
    <Container className="py-16">
      <h1 className="text-3xl font-bold text-brand-dark">Leave a Review</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Your feedback helps others find the care they need. We&rsquo;d be grateful if you shared
        your experience on Google.
      </p>
      <div className="mt-8">
        <a
          href={site.google}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Review us on Google
        </a>
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Please do not include medical or confidential health information in your review.
      </p>
    </Container>
  );
}
