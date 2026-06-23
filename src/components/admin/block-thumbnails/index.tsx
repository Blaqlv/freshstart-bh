import type { BlockType } from "@/lib/cms/blocks";

const FILL = "#D1D5DB"; // grey-300 — placeholder shapes
const LINE = "#6B7280"; // grey-500 — text lines

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 80 56" className="h-14 w-20" role="img" aria-hidden="true">
      {children}
    </svg>
  );
}

const line = (x: number, y: number, w: number, h = 3) => (
  <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={h / 2} fill={LINE} />
);

// ── New blocks (Part 9) ────────────────────────────────────────────────────
const NumberedListThumb = () => (
  <Frame>
    {[14, 30, 46].map((cy) => (
      <g key={cy}>
        <circle cx="12" cy={cy} r="5" fill={FILL} />
        {line(22, cy - 3, 44)}
        {line(22, cy + 3, 30)}
      </g>
    ))}
  </Frame>
);

const IconListThumb = () => (
  <Frame>
    {[10, 26, 42].map((y) => (
      <g key={`l${y}`}>
        <rect x="6" y={y} width="7" height="7" rx="1.5" fill={FILL} />
        {line(17, y + 2, 20)}
      </g>
    ))}
    {[10, 26, 42].map((y) => (
      <g key={`r${y}`}>
        <rect x="43" y={y} width="7" height="7" rx="1.5" fill={FILL} />
        {line(54, y + 2, 20)}
      </g>
    ))}
  </Frame>
);

const RichTextColumnsThumb = () => (
  <Frame>
    {[6, 30, 54].map((x) => (
      <g key={x}>
        {line(x, 10, 20)}
        {line(x, 17, 20)}
        {line(x, 24, 16)}
        {line(x, 31, 20)}
        {line(x, 38, 14)}
      </g>
    ))}
  </Frame>
);

const ImageLeftTextRightThumb = () => (
  <Frame>
    <rect x="6" y="10" width="32" height="36" rx="2" fill={FILL} />
    {[12, 20, 28, 36].map((y) => line(44, y, 30))}
  </Frame>
);

const ImageRightTextLeftThumb = () => (
  <Frame>
    <rect x="42" y="10" width="32" height="36" rx="2" fill={FILL} />
    {[12, 20, 28, 36].map((y) => line(6, y, 30))}
  </Frame>
);

const ImageTitleBelowThumb = () => (
  <Frame>
    <rect x="10" y="8" width="60" height="28" rx="2" fill={FILL} />
    {line(22, 42, 36, 4)}
    {line(28, 50, 24)}
  </Frame>
);

const ImageTitleBesideThumb = () => (
  <Frame>
    <rect x="6" y="14" width="28" height="28" rx="2" fill={FILL} />
    {[18, 26, 34].map((y) => line(40, y, 34, 4))}
  </Frame>
);

// ── Existing blocks (lightweight) ──────────────────────────────────────────
const HeroThumb = () => (
  <Frame>
    <rect x="6" y="8" width="68" height="40" rx="2" fill={FILL} />
    {line(24, 24, 32, 4)}
    <rect x="32" y="34" width="16" height="6" rx="3" fill={LINE} />
  </Frame>
);

const RichTextThumb = () => (
  <Frame>
    {line(8, 12, 30, 4)}
    {[22, 29, 36, 43].map((y) => line(8, y, 64))}
  </Frame>
);

const CtaThumb = () => (
  <Frame>
    <rect x="6" y="16" width="68" height="24" rx="3" fill={FILL} />
    {line(20, 24, 28)}
    <rect x="46" y="29" width="14" height="6" rx="3" fill={LINE} />
  </Frame>
);

const FaqThumb = () => (
  <Frame>
    {[12, 26, 40].map((y) => (
      <g key={y}>
        {line(8, y, 50)}
        <rect x="66" y={y - 1} width="6" height="6" rx="1.5" fill={FILL} />
      </g>
    ))}
  </Frame>
);

const GridThumb = () => (
  <Frame>
    {[
      [8, 10],
      [44, 10],
      [8, 32],
      [44, 32],
    ].map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="28" height="16" rx="2" fill={FILL} />
    ))}
  </Frame>
);

const TeamThumb = () => (
  <Frame>
    {[16, 40, 64].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="22" r="8" fill={FILL} />
        {line(cx - 9, 36, 18)}
      </g>
    ))}
  </Frame>
);

const TestimonialThumb = () => (
  <Frame>
    <rect x="8" y="10" width="64" height="28" rx="3" fill={FILL} />
    {[40, 47].map((cx) => (
      <circle key={cx} cx={cx} cy="47" r="3" fill={LINE} />
    ))}
  </Frame>
);

const GenericThumb = () => (
  <Frame>{[14, 22, 30, 38].map((y) => line(8, y, 64))}</Frame>
);

const thumbnails: Record<BlockType, () => React.ReactElement> = {
  hero: HeroThumb,
  richText: RichTextThumb,
  faqAccordion: FaqThumb,
  serviceGrid: GridThumb,
  testimonialCarousel: TestimonialThumb,
  locationGrid: GridThumb,
  teamGrid: TeamThumb,
  ctaBanner: CtaThumb,
  numberedList: NumberedListThumb,
  iconList: IconListThumb,
  richTextColumns: RichTextColumnsThumb,
  imageLeftTextRight: ImageLeftTextRightThumb,
  imageRightTextLeft: ImageRightTextLeftThumb,
  imageTitleBelow: ImageTitleBelowThumb,
  imageTitleBeside: ImageTitleBesideThumb,
};

export function BlockThumbnail({ type }: { type: BlockType }) {
  const Thumb = thumbnails[type] ?? GenericThumb;
  return <Thumb />;
}
