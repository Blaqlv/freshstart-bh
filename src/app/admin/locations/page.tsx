import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { syncLocationAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Admin locations + Google Business Profile sync (A4). Administrator only. A full
 * location editor is a future item; this provides the manual GBP re-sync button
 * and surfaces which locations have a GBP listing id configured.
 */
export default async function AdminLocations() {
  const session = await requireSession();
  if (session.role !== "ADMINISTRATOR") redirect("/forbidden");

  const locations = await db.location.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Locations</h1>
        <p className="text-sm text-ink-soft">
          Push name, phone, address, and hours to each Google Business Profile listing. Sync no-ops
          safely until GBP API credentials and a listing id are configured.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {locations.map((loc) => (
          <div key={loc.id} className="rounded-card border border-line bg-white p-5">
            <h2 className="font-semibold text-brand-dark">{loc.name}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {loc.street}, {loc.city}, {loc.state} {loc.zip}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{loc.phone ?? "No phone"}</p>
            <p className="mt-2 text-xs">
              GBP listing:{" "}
              {loc.gbpPlaceId ? (
                <code className="break-all">{loc.gbpPlaceId}</code>
              ) : (
                <span className="italic text-amber-700">not configured</span>
              )}
            </p>
            <form action={syncLocationAction.bind(null, loc.id)} className="mt-4">
              <button
                type="submit"
                className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Sync to Google Business Profile
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
