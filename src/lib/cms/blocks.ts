/**
 * Block-based content model. A page version stores an ordered array of these
 * blocks (PageVersion.blocks JSON). Non-technical staff rearrange/add/remove
 * blocks in the admin editor without touching code.
 */

import type { BlockSpacing } from "./spacing";

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
  | "imageTitleBeside"
  | "columnLayout"
  | "verticalSpacer"
  | "horizontalDivider"
  | "imageOnly";

export type BlockCategory = "text" | "images" | "layout" | "dynamic";

export const blockCategories: { id: BlockCategory; label: string }[] = [
  { id: "text", label: "Text & Content" },
  { id: "images", label: "Images" },
  { id: "layout", label: "Layout & Structure" },
  { id: "dynamic", label: "Dynamic Content" },
];

// ─── Shared background system (hero + ctaBanner) ───────────────────────────
// Additive: a block with no `background` keeps its original default styling.

export type BackgroundType = "color" | "image" | "gradient";

export type GradientDirection =
  | "to-r" | "to-l" | "to-b" | "to-t"
  | "to-br" | "to-bl" | "to-tr" | "to-tl";

export type BlockBackground = {
  type: BackgroundType;
  // Colour fill
  color?: string;
  colorOpacity?: number; // 0–100, default 100
  // Image
  imageUrl?: string;
  imageAlt?: string;
  imageObjectPosition?: string; // CSS object-position, e.g. "center top"
  // Overlay (on top of image)
  overlayColor?: string; // default "#000000"
  overlayOpacity?: number; // 0–100, default 40
  // Gradient
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: GradientDirection;
  gradientOpacity?: number; // 0–100, default 100
};

export type HeroBlock = {
  type: "hero";
  eyebrow?: string;
  heading: string;
  body?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  // Enhanced background controls (optional — omitted = original brand-dark hero)
  background?: BlockBackground;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  minHeight?: "sm" | "md" | "lg" | "full";
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
  // Enhanced background controls (optional — omitted = original brand-dark band)
  background?: BlockBackground;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  buttonVariant?: "primary" | "secondary" | "outline" | "white";
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  padding?: "sm" | "md" | "lg";
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

export type ImageOnlyBlock = {
  type: "imageOnly";
  image: { url: string; alt: string }; // alt required (enforced in the editor)
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  aspectRatio?: "16/9" | "4/3" | "1/1" | "3/2" | "original";
  objectFit?: "cover" | "contain"; // only when aspectRatio !== "original"
  align?: "left" | "center" | "right"; // only when maxWidth !== "full"
  rounded?: boolean;
  linkUrl?: string;
  linkOpensNewTab?: boolean;
  caption?: string; // plain text
};

// ─── Column layout (nested blocks per column) ──────────────────────────────

export type ColumnSplit =
  | "1/1"
  | "1-1"
  | "1-2"
  | "2-1"
  | "1-3"
  | "3-1"
  | "1-1-1"
  | "1-1-1-1"
  | "1-2-1"
  | "2-1-1"
  | "1-1-2";

/** Shared split metadata used by the renderer, editor split-picker, and thumbnails. */
export const COLUMN_SPLITS: { value: ColumnSplit; label: string; ratios: number[] }[] = [
  { value: "1/1", label: "Full width", ratios: [1] },
  { value: "1-1", label: "50% / 50%", ratios: [1, 1] },
  { value: "1-2", label: "33% / 66%", ratios: [1, 2] },
  { value: "2-1", label: "66% / 33%", ratios: [2, 1] },
  { value: "1-3", label: "25% / 75%", ratios: [1, 3] },
  { value: "3-1", label: "75% / 25%", ratios: [3, 1] },
  { value: "1-1-1", label: "Thirds", ratios: [1, 1, 1] },
  { value: "1-1-1-1", label: "Quarters", ratios: [1, 1, 1, 1] },
  { value: "1-2-1", label: "Focus middle", ratios: [1, 2, 1] },
  { value: "2-1-1", label: "Left heavy", ratios: [2, 1, 1] },
  { value: "1-1-2", label: "Right heavy", ratios: [1, 1, 2] },
];

export function columnCountForSplit(split: ColumnSplit): number {
  return COLUMN_SPLITS.find((s) => s.value === split)?.ratios.length ?? 2;
}

/** A column's percentage widths for a given split, e.g. "2-1" → [67, 33]. */
export function columnPercentages(split: ColumnSplit): number[] {
  const ratios = COLUMN_SPLITS.find((s) => s.value === split)?.ratios ?? [1, 1];
  const total = ratios.reduce((a, b) => a + b, 0);
  return ratios.map((r) => Math.round((r / total) * 100));
}

export type ColumnLayoutBlock = {
  type: "columnLayout";
  split: ColumnSplit;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  verticalAlign?: "top" | "center" | "bottom";
  stackOnMobile?: boolean; // default true
  reverseOnMobile?: boolean;
  // Child blocks per column. Index 0 = first column, etc. One level of nesting only.
  columns: Block[][];
};

// ─── Vertical spacer ───────────────────────────────────────────────────────

export type SpacerSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";

export type VerticalSpacerBlock = {
  type: "verticalSpacer";
  size: SpacerSize;
  customPx?: number; // only when size === "custom", 4–400
  showInEditor?: boolean; // default true — dashed outline in admin, invisible on site
};

// ─── Horizontal divider ────────────────────────────────────────────────────

export type HorizontalDividerBlock = {
  type: "horizontalDivider";
  style?: "solid" | "dashed" | "dotted" | "double";
  thickness?: 1 | 2 | 4;
  color?: string;
  width?: "full" | "3/4" | "1/2" | "1/4";
  align?: "left" | "center" | "right";
  label?: string;
  labelSize?: "xs" | "sm" | "base";
  spacingTop?: Exclude<SpacerSize, "custom">;
  spacingBottom?: Exclude<SpacerSize, "custom">;
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
  | ImageOnlyBlock
  | ColumnLayoutBlock
  | VerticalSpacerBlock
  | HorizontalDividerBlock
) & { isVisible?: boolean; spaceAbove?: BlockSpacing; spaceBelow?: BlockSpacing };

type BlockMeta = {
  type: BlockType;
  label: string;
  description: string;
  category: BlockCategory;
  create: () => Block;
};

export const blockRegistry: BlockMeta[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Large heading with optional eyebrow, body, and a call to action.",
    category: "layout",
    create: () => ({ type: "hero", heading: "New hero heading", body: "" }),
  },
  {
    type: "richText",
    label: "Rich text",
    description: "A heading and body paragraphs.",
    category: "text",
    create: () => ({ type: "richText", heading: "", body: "Add your content here." }),
  },
  {
    type: "faqAccordion",
    label: "FAQ accordion",
    description: "Expandable question / answer list.",
    category: "layout",
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
    category: "dynamic",
    create: () => ({ type: "serviceGrid", heading: "Our services" }),
  },
  {
    type: "testimonialCarousel",
    label: "Testimonials",
    description: "Published patient testimonials.",
    category: "dynamic",
    create: () => ({ type: "testimonialCarousel", heading: "Our reviews" }),
  },
  {
    type: "locationGrid",
    label: "Locations",
    description: "Grid of office locations.",
    category: "dynamic",
    create: () => ({ type: "locationGrid", heading: "Our locations" }),
  },
  {
    type: "teamGrid",
    label: "Team grid",
    description: "Grid of provider profiles.",
    category: "dynamic",
    create: () => ({ type: "teamGrid", heading: "Our team" }),
  },
  {
    type: "ctaBanner",
    label: "CTA banner",
    description: "Full-width call-to-action band.",
    category: "layout",
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
    category: "text",
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
    category: "text",
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
    category: "text",
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
    category: "images",
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
    category: "images",
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
    category: "images",
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
    category: "images",
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
  {
    type: "imageOnly",
    label: "Image Only",
    description:
      "A single standalone image with no title or text — ideal for visual breaks between sections.",
    category: "images",
    create: () => ({ type: "imageOnly", image: { url: "", alt: "" }, maxWidth: "full", aspectRatio: "original" }),
  },
  {
    type: "columnLayout",
    label: "Column Layout",
    description: "Split content into side-by-side columns with configurable width ratios.",
    category: "layout",
    create: () => ({
      type: "columnLayout",
      split: "1-1",
      gap: "md",
      verticalAlign: "top",
      stackOnMobile: true,
      columns: [[], []],
    }),
  },
  {
    type: "verticalSpacer",
    label: "Vertical Spacer",
    description: "Add vertical whitespace between sections.",
    category: "layout",
    create: () => ({ type: "verticalSpacer", size: "md", showInEditor: true }),
  },
  {
    type: "horizontalDivider",
    label: "Horizontal Divider",
    description: "Section separator with optional label text.",
    category: "layout",
    create: () => ({
      type: "horizontalDivider",
      style: "solid",
      thickness: 1,
      width: "full",
      align: "center",
      spacingTop: "md",
      spacingBottom: "md",
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

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A short, HTML-stripped summary of a block for the collapsed card (≤80 chars). */
export function blockPreview(block: Block): string {
  let raw = "";
  switch (block.type) {
    case "hero":
    case "richText":
    case "ctaBanner":
      raw = block.heading || block.body || "";
      break;
    case "faqAccordion":
      raw = block.heading || block.items[0]?.q || "";
      break;
    case "serviceGrid":
    case "testimonialCarousel":
    case "locationGrid":
    case "teamGrid":
      raw = block.heading || "";
      break;
    case "numberedList":
      raw = block.title || block.intro || block.items[0]?.heading || "";
      break;
    case "iconList":
      raw = block.title || block.intro || block.items[0]?.label || "";
      break;
    case "richTextColumns":
      raw = block.heading || block.intro || block.columns[0]?.body || "";
      break;
    case "imageLeftTextRight":
    case "imageRightTextLeft":
    case "imageTitleBeside":
      raw = block.title || block.body || "";
      break;
    case "imageTitleBelow":
      raw = block.title || block.caption || "";
      break;
    case "imageOnly":
      raw = block.image.alt || block.caption || "Image";
      break;
    case "columnLayout": {
      const count = block.columns.length;
      const total = block.columns.reduce((n, col) => n + col.length, 0);
      raw = `${count} columns · ${total} block${total === 1 ? "" : "s"}`;
      break;
    }
    case "verticalSpacer":
      raw = block.size === "custom" ? `${block.customPx ?? 0}px space` : `${block.size} space`;
      break;
    case "horizontalDivider":
      raw = block.label || "Divider";
      break;
  }
  const text = stripHtml(raw);
  return text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text;
}
