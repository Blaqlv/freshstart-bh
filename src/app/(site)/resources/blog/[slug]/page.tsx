import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  return db.blogPost.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <Container className="py-16">
      <Link href="/resources/blog" className="text-sm text-brand-dark hover:underline">← All posts</Link>
      <article className="mt-6 max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">{post.title}</h1>
        {post.publishedAt && (
          <time className="mt-2 block text-sm text-ink-soft" dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleDateString()}
          </time>
        )}
        <div className="mt-6 space-y-4 text-ink-soft">
          {(post.body ?? "").split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </article>
    </Container>
  );
}
