// src/lib/fhir/token-cache.ts
import "server-only";

/**
 * FHIR access-token cache backed by Upstash Redis REST (same pattern as
 * src/lib/rate-limit.ts — plain fetch, no SDK). Tokens are NEVER stored in
 * Postgres. When Upstash is unconfigured we skip caching (a fresh token is
 * fetched per request) — correctness preserved, no hard dependency.
 */
const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function key(scope: string) {
  return `fhir:token:${scope}`;
}

export async function getCachedToken(scope: string): Promise<string | null> {
  if (!REST_URL || !REST_TOKEN) return null;
  try {
    const res = await fetch(`${REST_URL}/get/${encodeURIComponent(key(scope))}`, {
      headers: { Authorization: `Bearer ${REST_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    return data.result ?? null;
  } catch {
    return null;
  }
}

/** Store with TTL (seconds). Shaves 30s off so we never serve an about-to-expire token. */
export async function setCachedToken(scope: string, token: string, ttlSeconds: number): Promise<void> {
  if (!REST_URL || !REST_TOKEN) return;
  const ttl = Math.max(30, ttlSeconds - 30);
  try {
    await fetch(`${REST_URL}/set/${encodeURIComponent(key(scope))}/${encodeURIComponent(token)}?EX=${ttl}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN}` },
      cache: "no-store",
    });
  } catch {
    // best-effort cache; ignore
  }
}
