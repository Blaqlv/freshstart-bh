import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RichBody } from "./RichBody";
import type { ImageTextSplitFields } from "@/lib/cms/blocks";

const gridClass: Record<"left" | "right", Record<number, string>> = {
  left: {
    40: "md:grid-cols-[40%_1fr]",
    45: "md:grid-cols-[45%_1fr]",
    50: "md:grid-cols-[50%_1fr]",
  },
  right: {
    40: "md:grid-cols-[1fr_40%]",
    45: "md:grid-cols-[1fr_45%]",
    50: "md:grid-cols-[1fr_50%]",
  },
};

export function ImageTextSplitBlock({
  block,
  imageSide,
  flush = false,
}: {
  block: ImageTextSplitFields;
  imageSide: "left" | "right";
  flush?: boolean;
}) {
  const isRight = imageSide === "right";
  const grid = gridClass[imageSide][block.imageWidthPercent ?? 50];
  return (
    <section className={flush ? "py-0" : "py-12"}>
      <Container className={`grid grid-cols-1 items-center gap-8 ${grid}`}>
        {/* DOM order keeps image above text on mobile; md:order swaps for desktop. */}
        <div className={isRight ? "md:order-2" : ""}>
          {block.image.url && (
            <img
              src={block.image.url}
              alt={block.image.alt}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-card object-cover"
            />
          )}
        </div>
        <div className={isRight ? "md:order-1" : ""}>
          <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>
          <RichBody text={block.body} className="mt-3 space-y-4 text-ink-soft" />
          {block.ctaLabel && block.ctaHref && (
            <div className="mt-5">
              <Button href={block.ctaHref}>{block.ctaLabel}</Button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
