import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

async function getProvider(slug: string) {
  return db.provider.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p) return {};
  return {
    title: `${p.name}${p.credentials ? `, ${p.credentials}` : ""}`,
    description: p.title ?? `Provider at Fresh Start Behavioral Health`,
  };
}

export default async function ProviderProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p) notFound();

  return (
    <Container className="py-16">
      <Link href="/providers" className="text-sm text-brand-dark hover:underline">← All providers</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-brand-dark">
            {p.name}{p.credentials ? `, ${p.credentials}` : ""}
          </h1>
          {p.title && <p className="mt-1 text-lg text-ink-soft">{p.title}</p>}

          {p.bio && (
            <div className="mt-6 space-y-4 text-ink-soft">
              {p.bio.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {p.specializations.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Specializations</h2>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {p.specializations.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {p.languages.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Languages</h2>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {p.languages.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-surface-alt p-6">
            {p.availability && <p className="text-sm font-medium text-brand-dark">{p.availability}</p>}
            {p.telehealth && (
              <p className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-dark">
                Telehealth available
              </p>
            )}
            <div className="mt-4">
              <Button href="/contact#appointment">Book with this provider</Button>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
