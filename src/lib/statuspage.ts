import "server-only";

/**
 * Statuspage integration (A11). The public status page is already provisioned;
 * we read its summary for the footer/portal status pill and (from a cron) open
 * an incident automatically if our own health check fails repeatedly.
 */

export const STATUSPAGE_URL = "https://freshstartbhinc.statuspage.io/";
const STATUS_JSON = "https://freshstartbhinc.statuspage.io/api/v2/status.json";

export type StatusLevel = "operational" | "partial" | "disruption" | "unknown";

export const STATUS_META: Record<StatusLevel, { label: string; dot: string }> = {
  operational: { label: "All Systems Operational", dot: "bg-green-500" },
  partial: { label: "Partial Outage", dot: "bg-amber-500" },
  disruption: { label: "Service Disruption", dot: "bg-red-500" },
  unknown: { label: "Status Unknown", dot: "bg-gray-400" },
};

/** Reads the live status, cached for 60s via ISR (A11 step 2/3). */
export async function getSystemStatus(): Promise<StatusLevel> {
  try {
    const res = await fetch(STATUS_JSON, { next: { revalidate: 60 } });
    if (!res.ok) return "unknown";
    const data = (await res.json()) as { status?: { indicator?: string } };
    switch (data.status?.indicator) {
      case "none":
        return "operational";
      case "minor":
      case "major":
        return "partial";
      case "critical":
        return "disruption";
      default:
        return "unknown";
    }
  } catch {
    return "unknown";
  }
}

/**
 * Creates an incident on the Statuspage account (A11 step 5). No-ops (returns
 * false) unless STATUSPAGE_API_KEY + STATUSPAGE_PAGE_ID are configured.
 */
export async function createStatuspageIncident(name: string, body: string): Promise<boolean> {
  const key = process.env.STATUSPAGE_API_KEY;
  const pageId = process.env.STATUSPAGE_PAGE_ID;
  if (!key || !pageId) return false;
  try {
    const res = await fetch(`https://api.statuspage.io/v1/pages/${pageId}/incidents`, {
      method: "POST",
      headers: { Authorization: `OAuth ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        incident: { name, status: "investigating", body, impact_override: "major" },
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
