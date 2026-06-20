/**
 * Block-based content model. A page version stores an ordered array of these
 * blocks (PageVersion.blocks JSON). Non-technical staff rearrange/add/remove
 * blocks in the admin editor without touching code.
 */

export type BlockType =
  | "hero"
  | "richText"
  | "faqAccordion"
  | "serviceGrid"
  | "testimonialCarousel"
  | "locationGrid"
  | "teamGrid"
  | "ctaBanner";

export type HeroBlock = {
  type: "hero";
  eyebrow?: string;
  heading: string;
  body?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
};

export type RichTextBlock = {
  type: "richText";
  heading?: string;
  body: string; // markdown-ish / plain paragraphs split on blank lines
};

export type FaqAccordionBlock = {
  type: "faqAccordion";
  heading?: string;
  items: { q: string; a: string }[];
};

export type ServiceGridBlock = {
  type: "serviceGrid";
  heading?: string;
  // empty = show all published services
  slugs?: string[];
};

export type TestimonialCarouselBlock = {
  type: "testimonialCarousel";
  heading?: string;
};

export type LocationGridBlock = {
  type: "locationGrid";
  heading?: string;
};

export type TeamGridBlock = {
  type: "teamGrid";
  heading?: string;
};

export type CtaBannerBlock = {
  type: "ctaBanner";
  heading: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type Block =
  | HeroBlock
  | RichTextBlock
  | FaqAccordionBlock
  | ServiceGridBlock
  | TestimonialCarouselBlock
  | LocationGridBlock
  | TeamGridBlock
  | CtaBannerBlock;

type BlockMeta = {
  type: BlockType;
  label: string;
  description: string;
  create: () => Block;
};

export const blockRegistry: BlockMeta[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Large heading with optional eyebrow, body, and a call to action.",
    create: () => ({ type: "hero", heading: "New hero heading", body: "" }),
  },
  {
    type: "richText",
    label: "Rich text",
    description: "A heading and body paragraphs.",
    create: () => ({ type: "richText", heading: "", body: "Add your content here." }),
  },
  {
    type: "faqAccordion",
    label: "FAQ accordion",
    description: "Expandable question / answer list.",
    create: () => ({
      type: "faqAccordion",
      heading: "Frequently asked questions",
      items: [{ q: "Question?", a: "Answer." }],
    }),
  },
  {
    type: "serviceGrid",
    label: "Service grid",
    description: "Grid of service cards (all published, or a chosen set).",
    create: () => ({ type: "serviceGrid", heading: "Our services" }),
  },
  {
    type: "testimonialCarousel",
    label: "Testimonials",
    description: "Published patient testimonials.",
    create: () => ({ type: "testimonialCarousel", heading: "Our reviews" }),
  },
  {
    type: "locationGrid",
    label: "Locations",
    description: "Grid of office locations.",
    create: () => ({ type: "locationGrid", heading: "Our locations" }),
  },
  {
    type: "teamGrid",
    label: "Team grid",
    description: "Grid of provider profiles.",
    create: () => ({ type: "teamGrid", heading: "Our team" }),
  },
  {
    type: "ctaBanner",
    label: "CTA banner",
    description: "Full-width call-to-action band.",
    create: () => ({
      type: "ctaBanner",
      heading: "Ready to get started?",
      ctaLabel: "Contact us",
      ctaHref: "/contact",
    }),
  },
];

export function blockLabel(type: BlockType): string {
  return blockRegistry.find((b) => b.type === type)?.label ?? type;
}

export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (b): b is Block => !!b && typeof b === "object" && typeof (b as Block).type === "string",
  );
}
