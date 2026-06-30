import { Container } from "@/components/ui/Container";
import type { ImageOnlyBlock as ImageOnlyBlockType } from "@/lib/cms/blocks";

const maxWidthClass: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

const aspectClass: Record<string, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
};

const alignClass: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

export function ImageOnlyBlock({
  block,
  flush = false,
}: {
  block: ImageOnlyBlockType;
  flush?: boolean;
}) {
  const { image, maxWidth = "full", aspectRatio = "original", objectFit = "cover", align = "center", rounded, linkUrl, linkOpensNewTab, caption } = block;
  if (!image?.url) return null;

  const rounding = rounded ? "overflow-hidden rounded-card" : "";
  const fit = objectFit === "contain" ? "object-contain" : "object-cover";

  const img =
    aspectRatio !== "original" ? (
      <div className={`relative w-full ${aspectClass[aspectRatio]} ${rounding}`}>
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${fit}`}
        />
      </div>
    ) : (
      <img src={image.url} alt={image.alt} loading="lazy" className={`h-auto w-full ${rounding}`} />
    );

  const visual = linkUrl ? (
    <a
      href={linkUrl}
      target={linkOpensNewTab ? "_blank" : undefined}
      rel={linkOpensNewTab ? "noopener noreferrer" : undefined}
      aria-label={image.alt || undefined}
    >
      {img}
    </a>
  ) : (
    img
  );

  return (
    <section className={flush ? "py-0" : "py-12"}>
      <Container>
        <figure className={`${maxWidthClass[maxWidth]} ${maxWidth !== "full" ? alignClass[align] : ""}`}>
          {visual}
          {caption && (
            <figcaption className="mt-2 text-center text-sm text-ink-soft">{caption}</figcaption>
          )}
        </figure>
      </Container>
    </section>
  );
}
