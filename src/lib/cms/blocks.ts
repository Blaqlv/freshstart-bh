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
  | "ctaBanner"
  | "numberedList"
  | "iconList"
  | "richTextColumns"
  | "imageLeftTextRight"
  | "imageRightTextLeft"
  | "imageTitleBelow"
  | "imageTitleBeside";

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

export type NumberedListBlock = {
  type: "numberedList";
  title?: string;
  intro?: string;
  items: { heading: string; body?: string }[];
  numberStyle?: "circle" | "square" | "plain";
  columns?: 1 | 2;
};

export type IconListBlock = {
  type: "iconList";
  title?: string;
  intro?: string;
  items: { icon: string; label: string; body?: string }[];
  iconColor?: string;
  columns?: 1 | 2 | 3;
};

export type RichTextColumnsBlock = {
  type: "richTextColumns";
  heading?: string;
  intro?: string;
  columns: { title?: string; body: string }[];
  dividers?: boolean;
};

/** Shared fields for the two image/text split blocks. */
export type ImageTextSplitFields = {
  image: { url: string; alt: string };
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageWidthPercent?: 40 | 45 | 50;
};
export type ImageLeftTextRightBlock = ImageTextSplitFields & { type: "imageLeftTextRight" };
export type ImageRightTextLeftBlock = ImageTextSplitFields & { type: "imageRightTextLeft" };

export type ImageTitleBelowBlock = {
  type: "imageTitleBelow";
  image: { url: string; alt: string };
  title: string;
  caption?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "3/2";
  maxWidth?: "sm" | "md" | "lg" | "full";
};

export type ImageTitleBesideBlock = {
  type: "imageTitleBeside";
  image: { url: string; alt: string };
  imagePosition: "left" | "right";
  title: string;
  body: string;
  imageSize?: "sm" | "md" | "lg";
  verticalAlign?: "top" | "center";
};

export type Block = (
  | HeroBlock
  | RichTextBlock
  | FaqAccordionBlock
  | ServiceGridBlock
  | TestimonialCarouselBlock
  | LocationGridBlock
  | TeamGridBlock
  | CtaBannerBlock
  | NumberedListBlock
  | IconListBlock
  | RichTextColumnsBlock
  | ImageLeftTextRightBlock
  | ImageRightTextLeftBlock
  | ImageTitleBelowBlock
  | ImageTitleBesideBlock
) & { isVisible?: boolean };

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
  {
    type: "numberedList",
    label: "Numbered list",
    description: "Numbered steps or items, each with a heading and optional text.",
    create: () => ({
      type: "numberedList",
      title: "How it works",
      numberStyle: "circle",
      columns: 1,
      items: [{ heading: "First step", body: "" }],
    }),
  },
  {
    type: "iconList",
    label: "Icon list",
    description: "Items with a Lucide icon, label, and optional text.",
    create: () => ({
      type: "iconList",
      title: "Why choose us",
      columns: 2,
      items: [{ icon: "CheckCircle2", label: "Benefit", body: "" }],
    }),
  },
  {
    type: "richTextColumns",
    label: "Text columns",
    description: "Two to four columns of text with an optional intro.",
    create: () => ({
      type: "richTextColumns",
      heading: "",
      dividers: false,
      columns: [
        { title: "", body: "Column one." },
        { title: "", body: "Column two." },
      ],
    }),
  },
  {
    type: "imageLeftTextRight",
    label: "Image left, text right",
    description: "Image on the left, heading and text on the right.",
    create: () => ({
      type: "imageLeftTextRight",
      image: { url: "", alt: "" },
      title: "Heading",
      body: "Add your content here.",
      imageWidthPercent: 50,
    }),
  },
  {
    type: "imageRightTextLeft",
    label: "Image right, text left",
    description: "Image on the right, heading and text on the left.",
    create: () => ({
      type: "imageRightTextLeft",
      image: { url: "", alt: "" },
      title: "Heading",
      body: "Add your content here.",
      imageWidthPercent: 50,
    }),
  },
  {
    type: "imageTitleBelow",
    label: "Image with title below",
    description: "A single image with a title and optional caption underneath.",
    create: () => ({
      type: "imageTitleBelow",
      image: { url: "", alt: "" },
      title: "Caption title",
      aspectRatio: "16/9",
      maxWidth: "lg",
    }),
  },
  {
    type: "imageTitleBeside",
    label: "Image with title beside",
    description: "Image on one side with a title and text beside it.",
    create: () => ({
      type: "imageTitleBeside",
      image: { url: "", alt: "" },
      imagePosition: "left",
      title: "Heading",
      body: "Add your content here.",
      imageSize: "md",
      verticalAlign: "top",
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
