import { Container } from "@/components/ui/Container";
import { RichBody } from "./RichBody";
import type { ImageTitleBelowBlock as ImageTitleBelowBlockType } from "@/lib/cms/blocks";

const aspectClass: Record<string, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
};

const maxWidthClass: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  full: "max-w-none",
};

export function ImageTitleBelowBlock({ block }: { block: ImageTitleBelowBlockType }) {
  return (
    <section className="py-12">
      <Container className={maxWidthClass[block.maxWidth ?? "lg"]}>
        {block.image.url && (
          <img
            src={block.image.url}
            alt={block.image.alt}
            loading="lazy"
            className={`w-full rounded-card object-cover ${aspectClass[block.aspectRatio ?? "16/9"]}`}
          />
        )}
        <h2 className="mt-4 text-2xl font-bold text-brand-dark">{block.title}</h2>
        {block.caption && (
          <RichBody text={block.caption} className="mt-2 space-y-2 text-ink-soft" />
        )}
      </Container>
    </section>
  );
}
