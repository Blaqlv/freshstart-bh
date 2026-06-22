import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Providers",
  description:
    "Meet the psychiatrists, physician assistants, nurse practitioners, and counselors at Fresh Start Behavioral Health.",
};

export default async function ProvidersIndex() {
  const providers = await db.provider.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <section className="bg-brand-dark text-white">
        <Container className="py-14">
          {/* Breadcrumbs removed per design update - Prompt 4. Do not restore without explicit instruction. */}
          <h1 className="text-4xl font-bold sm:text-5xl">Our Providers</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Seasoned behavioral health professionals who bring experience, compassion, and respect
            to every patient.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <li key={p.id}>
              <Link href={`/providers/${p.slug}`} className="flex h-full flex-col rounded-card border border-line bg-white p-6 transition hover:border-brand hover:shadow-lg">
                <div aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-brand-tint text-lg font-bold text-brand-dark">
                  {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-brand-dark">
                  {p.name}{p.credentials ? `, ${p.credentials}` : ""}
                </h2>
                {p.title && <p className="text-sm text-ink-soft">{p.title}</p>}
                {p.telehealth && (
                  <span className="mt-3 inline-block rounded-full bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand-dark">
                    Telehealth available
                  </span>
                )}
              </Link>
            </li>
          ))}
          {providers.length === 0 && <li className="text-ink-soft">No providers published yet.</li>}
        </ul>
      </Container>
    </>
  );
}
