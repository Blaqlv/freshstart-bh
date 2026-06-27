import "server-only";
import { db } from "@/lib/db";

/**
 * Google Business Profile sync (A4). Pushes a location's name/phone/address/hours
 * to its GBP listing so the CMS stays the source of truth and local rankings
 * don't suffer from a mismatch.
 *
 * Env-guarded: without GOOGLE_GBP_CLIENT_ID / _SECRET / _REFRESH_TOKEN this
 * no-ops and reports `skipped` so a CMS save is never blocked. `gbpPlaceId` on
 * the Location is the GBP resource name (locations/{id}); seed it per location.
 *
 * Note: there is no CMS location editor yet, so the "call on Save & Publish only
 * when address/phone/hours changed" hook (A4 step 3) should invoke this from that
 * action once it exists; today it is driven by the manual admin button (step 5).
 */

export type GbpSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

async function getAccessToken(): Promise<string | null> {
  const client_id = process.env.GOOGLE_GBP_CLIENT_ID;
  const client_secret = process.env.GOOGLE_GBP_CLIENT_SECRET;
  const refresh_token = process.env.GOOGLE_GBP_REFRESH_TOKEN;
  if (!client_id || !client_secret || !refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function syncLocationToGBP(locationId: string): Promise<GbpSyncResult> {
  const loc = await db.location.findUnique({ where: { id: locationId } });
  if (!loc) return { ok: false, reason: "location_not_found" };
  if (!loc.gbpPlaceId) return { ok: false, skipped: true, reason: "no_gbp_place_id" };

  const token = await getAccessToken();
  if (!token) return { ok: false, skipped: true, reason: "gbp_not_configured" };

  const body = {
    title: loc.name,
    phoneNumbers: { primaryPhone: loc.phone ?? undefined },
    storefrontAddress: {
      regionCode: "US",
      addressLines: [loc.street],
      locality: loc.city,
      administrativeArea: loc.state,
      postalCode: loc.zip,
    },
    regularHours: { periods: Array.isArray(loc.hours) ? loc.hours : [] },
  };

  try {
    const res = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${loc.gbpPlaceId}` +
        `?updateMask=title,phoneNumbers,storefrontAddress,regularHours`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    return res.ok ? { ok: true } : { ok: false, reason: `gbp_http_${res.status}` };
  } catch {
    return { ok: false, reason: "gbp_request_failed" };
  }
}
