// Run ONCE: npx tsx scripts/migrate-static-services.ts
// Scaffolds published CMS pages for all seeded services that don't have one yet.
import { PrismaClient } from "@prisma/client";
import { buildServicePageBlocks } from "../src/lib/services/template";

const db = new PrismaClient();

async function main() {
  const services = await db.service.findMany({
    where: { isActive: true, pageId: null },
    orderBy: { sortOrder: "asc" },
  });
  console.log(`Found ${services.length} services without pages.`);

  for (const svc of services) {
    const blocks = buildServicePageBlocks(svc);
    const page = await db.page.create({
      data: {
        slug: `services/${svc.slug}`,
        title: svc.title,
        template: "SERVICE_DETAIL",
        hasSidebar: true,
        status: "PUBLISHED",
        publishedVersion: 1,
        seoTitle: `${svc.title} | Fresh Start Behavioral Health`,
        seoDescription: svc.metaDescription ?? (svc.excerpt || null),
        versions: {
          create: { version: 1, status: "PUBLISHED", blocks: blocks as object },
        },
      },
    });
    await db.service.update({ where: { id: svc.id }, data: { pageId: page.id } });
    console.log(`✔ /services/${svc.slug}`);
  }
  console.log("Done.");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
