import "server-only";
import crypto from "crypto";

/**
 * Sliding-window rate limiting (A8).
 *
 * Backed by Upstash Redis via its REST API (no SDK dependency — plain fetch), so
 * it works on the edge/serverless runtime. When UPSTASH_REDIS_REST_URL / _TOKEN
 * are not configured (local dev, preview before secrets are set) the limiter
 * fails OPEN and allows the request, so the site stays usable; it also fails
 * open if Upstash itself is unreachable so a limiter outage never blocks a
 * patient from contacting the clinic.
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** sha256 of an IP — never log or store the raw IP (A8/A2). */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

/** Parse windows like "1h", "30m", "1 d", "10 s" into milliseconds. */
function windowToMs(window: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(window.trim());
  if (!m) return 60_000;
  const n = Number(m[1]);
  const unit = m[2];
  return n * { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
}

export type RateLimitResult = { ok: boolean; remaining: number };

/**
 * Returns ok=false when `identifier` has made more than `max` requests within
 * `window`. `identifier` should already be hashed (e.g. hashIp(ip)).
 */
export async function checkRateLimit(
  identifier: string,
  max: number,
  window: string,
): Promise<RateLimitResult> {
  if (!REST_URL || !REST_TOKEN) return { ok: true, remaining: max };

  const windowMs = windowToMs(window);
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  const member = `${now}-${crypto.randomUUID()}`;

  // Atomic-ish sliding window: drop expired entries, add this hit, count, expire.
  const pipeline = [
    ["ZREMRANGEBYSCORE", key, "0", String(now - windowMs)],
    ["ZADD", key, String(now), member],
    ["ZCARD", key],
    ["PEXPIRE", key, String(windowMs)],
  ];

  try {
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN}` },
      body: JSON.stringify(pipeline),
      cache: "no-store",
    });
    if (!res.ok) return { ok: true, remaining: max };
    const data = (await res.json()) as { result: unknown }[];
    const count = Number(data?.[2]?.result ?? 0);
    return { ok: count <= max, remaining: Math.max(0, max - count) };
  } catch {
    return { ok: true, remaining: max };
  }
}

export const TOO_MANY_REQUESTS =
  "Too many requests. Please wait a moment and try again, or call us directly at 937-579-0073.";
