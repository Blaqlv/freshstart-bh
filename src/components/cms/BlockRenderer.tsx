import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import type { Block } from "@/lib/cms/blocks";
import { NumberedListBlock } from "./blocks/NumberedListBlock";
import { IconListBlock } from "./blocks/IconListBlock";
import { RichTextColumnsBlock } from "./blocks/RichTextColumnsBlock";
import { ImageTextSplitBlock } from "./blocks/ImageTextSplitBlock";
import { ImageTitleBelowBlock } from "./blocks/ImageTitleBelowBlock";
import { ImageTitleBesideBlock } from "./blocks/ImageTitleBesideBlock";
import { RichBody } from "./blocks/RichBody";

/** Renders an ordered list of CMS blocks. Server component (queries live data). */
export async function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .filter((block) => block.isVisible !== false)
        .map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
    </>
  );
}

async function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return (
        <section className="bg-brand-dark text-white">
          <Container className="py-16">
            {block.eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">{block.eyebrow}</p>
            )}
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{block.heading}</h1>
            {block.body && <RichBody text={block.body} className="mt-4 max-w-2xl text-lg text-white/85" />}
            {block.primaryCtaLabel && block.primaryCtaHref && (
              <div className="mt-6">
                <Button href={block.primaryCtaHref} variant="white">{block.primaryCtaLabel}</Button>
              </div>
            )}
          </Container>
        </section>
      );

    case "richText":
      return (
        <section className="py-12">
          <Container className="max-w-3xl">
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <RichBody text={block.body} className="mt-3 space-y-4 text-ink-soft" />
          </Container>
        </section>
      );

    case "ctaBanner":
      return (
        <section className="bg-brand-dark py-14 text-white">
          <Container className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-bold">{block.heading}</h2>
              {block.body && <RichBody text={block.body} className="mt-1 text-white/90" />}
            </div>
            {block.ctaLabel && block.ctaHref && (
              <Button href={block.ctaHref} variant="white">{block.ctaLabel}</Button>
            )}
          </Container>
        </section>
      );

    case "faqAccordion":
      return (
        <section className="py-12">
          <Container className="max-w-3xl">
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <div className="mt-4 divide-y divide-line rounded-card border border-line">
              {block.items.map((f, k) => (
                <details key={k} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-brand-dark">
                    {f.q}
                    <span aria-hidden className="ml-4 transition group-open:rotate-45">+</span>
                  </summary>
                  <RichBody text={f.a} className="mt-3 text-ink-soft" />
                </details>
              ))}
            </div>
          </Container>
        </section>
      );

    case "serviceGrid": {
      const services = await db.service.findMany({
        where: {
          status: "PUBLISHED",
          ...(block.slugs && block.slugs.length ? { slug: { in: block.slugs } } : {}),
        },
        orderBy: { order: "asc" },
      });
      return (
        <section className="py-12">
          <Container>
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <li key={s.id}>
                  <Link href={`/services/${s.slug}`} className="block h-full rounded-card border border-line bg-white p-6 hover:border-brand hover:shadow-lg">
                    <h3 className="font-semibold text-brand-dark">{s.title}</h3>
                    {s.summary && <p className="mt-2 text-sm text-ink-soft">{s.summary}</p>}
                  </Link>
                </li>
              ))}
              {services.length === 0 && <li className="text-sm text-ink-soft">No services published yet.</li>}
            </ul>
          </Container>
        </section>
      );
    }

    case "testimonialCarousel": {
      const items = await db.testimonial.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        take: 6,
      });
      return (
        <section className="bg-surface-alt py-12">
          <Container>
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {items.map((t) => (
                <li key={t.id} className="rounded-card border border-line bg-white p-6">
                  <div aria-hidden className="text-gold">{"★".repeat(t.rating)}</div>
                  <blockquote className="mt-2 text-ink-soft">&ldquo;{t.quote}&rdquo;</blockquote>
                  <p className="mt-3 text-sm font-semibold text-brand-dark">{t.author} · {t.source}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      );
    }

    case "locationGrid": {
      const items = await db.location.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
      });
      return (
        <section className="py-12">
          <Container>
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((l) => (
                <li key={l.id} className="rounded-card border border-line bg-white p-6">
                  <h3 className="font-semibold text-brand-dark">{l.name}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{l.street}<br />{l.city}, {l.state} {l.zip}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      );
    }

    case "teamGrid": {
      const items = await db.provider.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
      });
      return (
        <section className="bg-surface-alt py-12">
          <Container>
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <li key={p.id} className="rounded-card border border-line bg-white p-6">
                  <h3 className="font-semibold text-brand-dark">{p.name}{p.credentials ? `, ${p.credentials}` : ""}</h3>
                  {p.title && <p className="text-sm text-ink-soft">{p.title}</p>}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      );
    }

    case "numberedList":
      return <NumberedListBlock block={block} />;

    case "iconList":
      return <IconListBlock block={block} />;

    case "richTextColumns":
      return <RichTextColumnsBlock block={block} />;

    case "imageLeftTextRight":
      return <ImageTextSplitBlock block={block} imageSide="left" />;

    case "imageRightTextLeft":
      return <ImageTextSplitBlock block={block} imageSide="right" />;

    case "imageTitleBelow":
      return <ImageTitleBelowBlock block={block} />;

    case "imageTitleBeside":
      return <ImageTitleBesideBlock block={block} />;

    default:
      return null;
  }
}
