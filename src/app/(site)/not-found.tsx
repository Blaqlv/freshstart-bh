import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">404</p>
      <h1 className="mt-2 text-3xl font-bold text-brand-dark">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        The page you&rsquo;re looking for may have moved. Let&rsquo;s get you back on track.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button href="/">Back to home</Button>
        <Button href="/contact" variant="secondary">Contact Us</Button>
      </div>
    </Container>
  );
}
