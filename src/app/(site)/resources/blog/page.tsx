import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles and insights from the Fresh Start Behavioral Health team.",
};

export default async function BlogIndex() {
  const posts = await db.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">Blog</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Insights on mental health, recovery, and wellness from our team.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/resources/blog/${p.slug}`} className="flex h-full flex-col rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg">
                <h2 className="text-lg font-semibold text-brand-dark">{p.title}</h2>
                {p.excerpt && <p className="mt-2 flex-1 text-sm text-ink-soft">{p.excerpt}</p>}
                {p.publishedAt && (
                  <time className="mt-4 text-xs text-ink-soft" dateTime={p.publishedAt.toISOString()}>
                    {p.publishedAt.toLocaleDateString()}
                  </time>
                )}
              </Link>
            </li>
          ))}
          {posts.length === 0 && <li className="text-ink-soft">No posts published yet.</li>}
        </ul>
      </Container>
    </>
  );
}
