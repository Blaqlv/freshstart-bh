import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseBlocks } from "@/lib/cms/blocks";
import { BlockRenderer } from "@/components/cms/BlockRenderer";

export const dynamic = "force-dynamic";

async function getPage(slugParts: string[]) {
  const slug = slugParts.join("/");
  return db.page.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { versions: { orderBy: { version: "desc" } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: page.canonicalUrl ? { canonical: page.canonicalUrl } : undefined,
    openGraph: page.ogImageUrl ? { images: [page.ogImageUrl] } : undefined,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  // Prefer the published version; fall back to the latest.
  const version =
    page.versions.find((v) => v.version === page.publishedVersion) ?? page.versions[0];
  const blocks = parseBlocks(version?.blocks);

  return <BlockRenderer blocks={blocks} />;
}
