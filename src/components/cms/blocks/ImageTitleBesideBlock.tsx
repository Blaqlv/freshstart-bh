import { Container } from "@/components/ui/Container";
import { RichBody } from "./RichBody";
import type { ImageTitleBesideBlock as ImageTitleBesideBlockType } from "@/lib/cms/blocks";

const sizeClass: Record<"left" | "right", Record<string, string>> = {
  left: {
    sm: "md:grid-cols-[30%_1fr]",
    md: "md:grid-cols-[40%_1fr]",
    lg: "md:grid-cols-[50%_1fr]",
  },
  right: {
    sm: "md:grid-cols-[1fr_30%]",
    md: "md:grid-cols-[1fr_40%]",
    lg: "md:grid-cols-[1fr_50%]",
  },
};

export function ImageTitleBesideBlock({ block, flush = false }: { block: ImageTitleBesideBlockType; flush?: boolean }) {
  const isRight = block.imagePosition === "right";
  const grid = sizeClass[block.imagePosition][block.imageSize ?? "md"];
  const align = block.verticalAlign === "center" ? "md:items-center" : "md:items-start";
  return (
    <section className={flush ? "py-0" : "py-12"}>
      <Container className={`grid grid-cols-1 gap-8 ${align} ${grid}`}>
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
        </div>
      </Container>
    </section>
  );
}
