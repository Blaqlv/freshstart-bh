import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import type { RichTextColumnsBlock as RichTextColumnsBlockType } from "@/lib/cms/blocks";

const gridByCount: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

export function RichTextColumnsBlock({ block }: { block: RichTextColumnsBlockType }) {
  const grid = gridByCount[block.columns.length] ?? "md:grid-cols-2";
  return (
    <section className="py-12">
      <Container>
        {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
        {block.intro && (
          <Paragraphs text={block.intro} className="mt-3 max-w-3xl space-y-4 text-ink-soft" />
        )}
        <div className={`mt-6 grid grid-cols-1 gap-8 ${grid}`}>
          {block.columns.map((col, i) => (
            <div
              key={i}
              className={block.dividers && i > 0 ? "md:border-l md:border-line md:pl-8" : ""}
            >
              {col.title && <h3 className="font-semibold text-brand-dark">{col.title}</h3>}
              <Paragraphs text={col.body} className="mt-2 space-y-3 text-ink-soft" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
