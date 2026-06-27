import { db } from "@/lib/db";
import { parseBlocks } from "@/lib/cms/blocks";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

/** Home is CMS-driven: renders the published "home" page's blocks. */
export default async function HomePage() {
  const page = await db.page.findFirst({
    where: { slug: "home", status: "PUBLISHED" },
    include: { versions: { orderBy: { version: "desc" } } },
  });

  const version =
    page?.versions.find((v) => v.version === page.publishedVersion) ?? page?.versions[0];
  const blocks = parseBlocks(version?.blocks);

  if (blocks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <JsonLd schema={organizationSchema()} />
        <h1 className="text-3xl font-bold text-brand-dark">Fresh Start Behavioral Health</h1>
        <p className="mt-4 text-ink-soft">
          The homepage has not been published yet. Sign in to the admin portal to publish it.
        </p>
      </div>
    );
  }

  return (
    <>
      <JsonLd schema={organizationSchema()} />
      <BlockRenderer blocks={blocks} />
    </>
  );
}
