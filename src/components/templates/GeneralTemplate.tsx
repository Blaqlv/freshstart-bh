import type { Page } from "@prisma/client";
import { Container } from "@/components/ui/Container";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ServiceSidebar } from "@/components/cms/ServiceSidebar";
import { splitBlocksForSidebar, type Block } from "@/lib/cms/blocks";

/**
 * GENERAL layout. Full-width block canvas by default; when page.hasSidebar is
 * true, the same two-column layout as SERVICE_DETAIL (no pinned form). Only
 * the narrow "content" block runs are paired with the sidebar — full-bleed
 * blocks (hero, CTA banner, related grids, etc.) keep rendering full width.
 */
export function GeneralTemplate({ page, blocks }: { page: Page; blocks: Block[] }) {
  if (!page.hasSidebar) {
    return <BlockRenderer blocks={blocks} />;
  }
  const segments = splitBlocksForSidebar(blocks);
  return (
    <>
      {segments.map((segment, i) =>
        segment.wide ? (
          <BlockRenderer key={i} blocks={segment.blocks} />
        ) : (
          <Container key={i} className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
            <div>
              <BlockRenderer blocks={segment.blocks} />
            </div>
            <ServiceSidebar />
          </Container>
        ),
      )}
    </>
  );
}
