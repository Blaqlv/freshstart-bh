import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import type { NumberedListBlock as NumberedListBlockType } from "@/lib/cms/blocks";

const shapeClass = { circle: "rounded-full", square: "rounded-md" } as const;

export function NumberedListBlock({ block }: { block: NumberedListBlockType }) {
  const style = block.numberStyle ?? "circle";
  const cols = block.columns === 2 ? "sm:grid-cols-2" : "grid-cols-1";
  return (
    <section className="py-12">
      <Container className="max-w-4xl">
        {block.title && <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>}
        {block.intro && (
          <Paragraphs text={block.intro} className="mt-3 space-y-4 text-ink-soft" />
        )}
        <ol className={`mt-6 grid gap-6 ${cols}`}>
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-4">
              <span
                aria-hidden
                className={
                  style === "plain"
                    ? "shrink-0 text-2xl font-bold text-brand-dark"
                    : `flex h-10 w-10 shrink-0 items-center justify-center bg-brand-dark font-bold text-white ${shapeClass[style]}`
                }
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-brand-dark">{item.heading}</h3>
                {item.body && (
                  <Paragraphs text={item.body} className="mt-1 space-y-2 text-sm text-ink-soft" />
                )}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
