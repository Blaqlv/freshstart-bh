import type { Page } from "@prisma/client";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ServiceSidebar } from "@/components/cms/ServiceSidebar";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import type { Block } from "@/lib/cms/blocks";

/**
 * SERVICE_DETAIL layout: editable block canvas + static sidebar, with the
 * appointment form always pinned below the blocks (anchored #contact-form so the
 * sidebar "Request Information" link scrolls to it).
 */
export async function ServiceDetailTemplate({
  page,
  blocks,
}: {
  page: Page;
  blocks: Block[];
}) {
  const [locations, services] = await Promise.all([
    db.location.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    db.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
      <div>
        <BlockRenderer blocks={blocks} />
        <section id="contact-form" className="pt-12">
          <h2 className="text-2xl font-bold text-brand-dark">Request an appointment</h2>
          <div className="mt-6 max-w-2xl">
            <AppointmentForm
              locations={locations.map((l) => ({ value: l.slug, label: l.name }))}
              services={services.map((s) => ({ value: s.slug, label: s.title }))}
              defaultService={page.slug}
            />
          </div>
        </section>
      </div>
      <ServiceSidebar currentSlug={page.slug} />
    </Container>
  );
}
