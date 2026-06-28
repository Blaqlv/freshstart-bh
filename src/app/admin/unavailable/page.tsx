import { getSession } from "@/lib/auth";

export default async function UnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const session = await getSession();
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">This feature is currently unavailable</h1>
      <p className="mt-3 text-gray-600">
        Contact your system administrator if you believe you should have access.
      </p>
      {session?.isSuperAdmin && m ? (
        <p className="mt-4 rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-700">
          Disabled module: <strong>{m}</strong>
        </p>
      ) : null}
    </main>
  );
}
