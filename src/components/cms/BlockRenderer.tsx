import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import type { Block, BlockBackground, ColumnSplit } from "@/lib/cms/blocks";
import { resolveBackground } from "@/lib/cms/background";
import { resolveBlockSpacing } from "@/lib/cms/spacing";
import { NumberedListBlock } from "./blocks/NumberedListBlock";
import { IconListBlock } from "./blocks/IconListBlock";
import { RichTextColumnsBlock } from "./blocks/RichTextColumnsBlock";
import { ImageTextSplitBlock } from "./blocks/ImageTextSplitBlock";
import { ImageTitleBelowBlock } from "./blocks/ImageTitleBelowBlock";
import { ImageTitleBesideBlock } from "./blocks/ImageTitleBesideBlock";
import { ImageOnlyBlock } from "./blocks/ImageOnlyBlock";
import { VerticalSpacerBlock } from "./blocks/VerticalSpacerBlock";
import { HorizontalDividerBlock } from "./blocks/HorizontalDividerBlock";
import { RichBody } from "./blocks/RichBody";

/** Plain blocks drop their own outer vertical padding when the wrapper manages it. */
const vpad = (flush: boolean, base: string) => (flush ? "py-0" : base);

const heroHeightMap: Record<string, string> = {
  sm: "min-h-[300px]",
  md: "min-h-[480px]",
  lg: "min-h-[600px]",
  full: "min-h-screen",
};

const textAlignMap: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** Absolutely-positioned background layer for hero/CTA so it never fades the content. */
function BackgroundLayer({ bg }: { bg: BlockBackground }) {
  const { wrapperStyle, overlayStyle, hasOverlay } = resolveBackground(bg);
  return (
    <>
      <div className="absolute inset-0" aria-hidden="true" style={{ ...wrapperStyle, position: "absolute" }} />
      {hasOverlay && <div className="absolute inset-0" aria-hidden="true" style={overlayStyle} />}
    </>
  );
}

const ctaButtonVariant = (v: string | undefined): "primary" | "secondary" | "outline" | "white" =>
  v === "secondary" || v === "outline" || v === "primary" ? v : "white";

// Column layout: maps a split to a responsive Tailwind grid + per-column spans.
const splitMap: Record<ColumnSplit, { grid: string; spans: string[]; ratios: number[] }> = {
  "1/1": { grid: "grid-cols-1", spans: [""], ratios: [1] },
  "1-1": { grid: "md:grid-cols-2", spans: ["", ""], ratios: [1, 1] },
  "1-2": { grid: "md:grid-cols-3", spans: ["md:col-span-1", "md:col-span-2"], ratios: [1, 2] },
  "2-1": { grid: "md:grid-cols-3", spans: ["md:col-span-2", "md:col-span-1"], ratios: [2, 1] },
  "1-3": { grid: "md:grid-cols-4", spans: ["md:col-span-1", "md:col-span-3"], ratios: [1, 3] },
  "3-1": { grid: "md:grid-cols-4", spans: ["md:col-span-3", "md:col-span-1"], ratios: [3, 1] },
  "1-1-1": { grid: "md:grid-cols-3", spans: ["", "", ""], ratios: [1, 1, 1] },
  "1-1-1-1": { grid: "md:grid-cols-2 lg:grid-cols-4", spans: ["", "", "", ""], ratios: [1, 1, 1, 1] },
  "1-2-1": { grid: "md:grid-cols-4", spans: ["md:col-span-1", "md:col-span-2", "md:col-span-1"], ratios: [1, 2, 1] },
  "2-1-1": { grid: "md:grid-cols-4", spans: ["md:col-span-2", "md:col-span-1", "md:col-span-1"], ratios: [2, 1, 1] },
  "1-1-2": { grid: "md:grid-cols-4", spans: ["md:col-span-1", "md:col-span-1", "md:col-span-2"], ratios: [1, 1, 2] },
};

const gapMap: Record<string, string> = {
  none: "gap-0",
  sm: "gap-4",
  md: "gap-8",
  lg: "gap-12",
  xl: "gap-16",
};
const gapPxMap: Record<string, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "3rem",
  xl: "4rem",
};
const vAlignMap: Record<string, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};
const vAlignInline: Record<string, string> = { top: "start", center: "center", bottom: "end" };

/** Renders an ordered list of CMS blocks. Server component (queries live data). */
export async function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .filter((block) => block.isVisible !== false)
        .map((block, i) => {
          const sp = resolveBlockSpacing(block);
          return (
            <div
              key={i}
              data-block-type={block.type}
              style={{
                paddingTop: sp.paddingTop || undefined,
                paddingBottom: sp.paddingBottom || undefined,
              }}
            >
              <BlockView block={block} flush={sp.flush} />
            </div>
          );
        })}
    </>
  );
}

async function BlockView({ block, flush = false }: { block: Block; flush?: boolean }) {
  switch (block.type) {
    case "hero": {
      const bg = block.background;
      const minH = bg && block.minHeight ? heroHeightMap[block.minHeight] : "";
      const align = block.textAlign ? textAlignMap[block.textAlign] : "";
      // Custom text colour wins; otherwise white on image/gradient (and on the
      // default brand-dark hero), inherit on a solid-colour background.
      const colorStyle = block.textColor
        ? { color: block.textColor }
        : bg && bg.type !== "color"
          ? { color: "#ffffff" }
          : undefined;
      return (
        <section
          className={`relative overflow-hidden ${bg ? "" : "bg-brand-dark text-white"} ${minH} ${minH ? "flex items-center" : ""}`}
          style={colorStyle}
        >
          {bg && <BackgroundLayer bg={bg} />}
          <Container className={`relative z-10 w-full py-16 ${align}`}>
            {block.eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{block.eyebrow}</p>
            )}
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{block.heading}</h1>
            {block.body && <RichBody text={block.body} className="mt-4 max-w-2xl text-lg opacity-90" />}
            {block.primaryCtaLabel && block.primaryCtaHref && (
              <div className="mt-6">
                <Button href={block.primaryCtaHref} variant="white">{block.primaryCtaLabel}</Button>
              </div>
            )}
          </Container>
        </section>
      );
    }

    case "richText":
      return (
        <section className={vpad(flush, "py-12")}>
          <Container className="max-w-3xl">
            {block.heading && <h2 className="text-2xl font-bold text-brand-dark">{block.heading}</h2>}
            <RichBody text={block.body} className="mt-3 space-y-4 text-ink-soft" />
          </Container>
        </section>
      );

    case "ctaBanner": {
      const bg = block.background;
      const padMap: Record<string, string> = { sm: "py-8", md: "py-12", lg: "py-20" };
      const pad = padMap[block.padding ?? "md"];
      const align = block.textAlign ?? "center";
      const colorStyle = block.textColor
        ? { color: block.textColor }
        : bg && bg.type !== "color"
          ? { color: "#ffffff" }
          : undefined;
      const itemsAlign =
        align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left";
      const justify = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
      return (
        <section
          className={`relative overflow-hidden ${bg ? "" : "bg-brand-dark text-white"} ${pad}`}
          style={colorStyle}
        >
          {bg && <BackgroundLayer bg={bg} />}
          <Container className={`relative z-10 flex flex-col gap-4 ${itemsAlign}`}>
            <div>
              <h2 className="text-2xl font-bold">{block.heading}</h2>
              {block.body && <RichBody text={block.body} className="mt-1 opacity-90" />}
            </div>
            {(block.ctaLabel || block.secondaryCtaLabel) && (
              <div className={`flex flex-wrap gap-3 ${justify}`}>
                {block.ctaLabel && block.ctaHref && (
                  <Button href={block.ctaHref} variant={ctaButtonVariant(block.buttonVariant)}>
                    {block.ctaLabel}
                  </Button>
                )}
                {block.secondaryCtaLabel && block.secondaryCtaHref && (
                  <Button href={block.secondaryCtaHref} variant="outline">
                    {block.secondaryCtaLabel}
                  </Button>
                )}
              </div>
            )}
          </Container>
        </section>
      );
    }

    case "faqAccordion":
      return (
        <section className={vpad(flush, "py-12")}>
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
        <section className="bg-surface-alt py-12">
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
      // Only staff-approved reviews surface publicly (A9).
      const items = await db.testimonial.findMany({
        where: { moderation: "APPROVED" },
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
        <section className={vpad(flush, "py-12")}>
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
      return <NumberedListBlock block={block} flush={flush} />;

    case "iconList":
      return <IconListBlock block={block} flush={flush} />;

    case "richTextColumns":
      return <RichTextColumnsBlock block={block} flush={flush} />;

    case "imageLeftTextRight":
      return <ImageTextSplitBlock block={block} imageSide="left" flush={flush} />;

    case "imageRightTextLeft":
      return <ImageTextSplitBlock block={block} imageSide="right" flush={flush} />;

    case "imageTitleBelow":
      return <ImageTitleBelowBlock block={block} flush={flush} />;

    case "imageTitleBeside":
      return <ImageTitleBesideBlock block={block} flush={flush} />;

    case "imageOnly":
      return <ImageOnlyBlock block={block} flush={flush} />;

    case "verticalSpacer":
      return <VerticalSpacerBlock block={block} />;

    case "horizontalDivider":
      return <HorizontalDividerBlock block={block} />;

    case "columnLayout": {
      const layout = splitMap[block.split] ?? splitMap["1-1"];
      const count = layout.spans.length;
      const gap = gapMap[block.gap ?? "md"];
      const valign = vAlignMap[block.verticalAlign ?? "top"];
      const stack = block.stackOnMobile !== false;
      const reverse = stack && block.reverseOnMobile;

      // One level of nesting only: drop any nested column layouts and hidden blocks.
      const columns: Block[][] = Array.from({ length: count }, (_, i) =>
        (block.columns[i] ?? []).filter((b) => b.type !== "columnLayout" && b.isVisible !== false),
      );

      const renderColumn = (blocks: Block[], colIdx: number) => (
        <div key={colIdx} className={stack ? layout.spans[colIdx] ?? "" : ""}>
          {blocks.map((child, i) => (
            <BlockView key={i} block={child} />
          ))}
        </div>
      );

      if (!stack) {
        // Side-by-side at every width — explicit template, no responsive stacking.
        return (
          <Container className={vpad(flush, "py-8")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: layout.ratios.map((r) => `${r}fr`).join(" "),
                gap: gapPxMap[block.gap ?? "md"],
                alignItems: vAlignInline[block.verticalAlign ?? "top"],
              }}
            >
              {columns.map(renderColumn)}
            </div>
          </Container>
        );
      }

      const wrapperClass = reverse
        ? `flex flex-col-reverse ${gap} ${valign} md:grid md:${layout.grid.replace("md:", "")}`
        : `grid grid-cols-1 ${layout.grid} ${gap} ${valign}`;

      return (
        <Container className={vpad(flush, "py-8")}>
          <div className={wrapperClass}>{columns.map(renderColumn)}</div>
        </Container>
      );
    }

    default:
      return null;
  }
}
