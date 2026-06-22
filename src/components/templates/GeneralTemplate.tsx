import type { Page } from "@prisma/client";
import { Container } from "@/components/ui/Container";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ServiceSidebar } from "@/components/cms/ServiceSidebar";
import type { Block } from "@/lib/cms/blocks";

/**
 * GENERAL layout. Full-width block canvas by default; when page.hasSidebar is
 * true, the same two-column layout as SERVICE_DETAIL (no pinned form).
 */
export function GeneralTemplate({ page, blocks }: { page: Page; blocks: Block[] }) {
  if (!page.hasSidebar) {
    return <BlockRenderer blocks={blocks} />;
  }
  return (
    <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
      <div>
        <BlockRenderer blocks={blocks} />
      </div>
      <ServiceSidebar />
    </Container>
  );
}
