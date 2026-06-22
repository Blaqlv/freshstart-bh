import { Container } from "@/components/ui/Container";
import { Paragraphs } from "./Paragraphs";
import { resolveIcon } from "@/lib/cms/resolveIcon";
import type { IconListBlock as IconListBlockType } from "@/lib/cms/blocks";

const colClass = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
} as const;

export function IconListBlock({ block }: { block: IconListBlockType }) {
  const cols = colClass[block.columns ?? 1];
  return (
    <section className="py-12">
      <Container>
        {block.title && <h2 className="text-2xl font-bold text-brand-dark">{block.title}</h2>}
        {block.intro && (
          <Paragraphs text={block.intro} className="mt-3 space-y-4 text-ink-soft" />
        )}
        <ul className={`mt-6 grid gap-6 ${cols}`}>
          {block.items.map((item, i) => {
            const Icon = resolveIcon(item.icon);
            return (
              <li key={i} className="flex gap-3">
                <Icon
                  aria-hidden
                  className={`mt-0.5 h-6 w-6 shrink-0 ${block.iconColor ? "" : "text-brand-dark"}`}
                  style={block.iconColor ? { color: block.iconColor } : undefined}
                />
                <div>
                  <h3 className="font-semibold text-brand-dark">{item.label}</h3>
                  {item.body && (
                    <Paragraphs text={item.body} className="mt-1 space-y-2 text-sm text-ink-soft" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
