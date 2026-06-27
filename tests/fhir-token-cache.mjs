// tests/fhir-token-cache.mjs
import assert from "node:assert";
import { getCachedToken, setCachedToken } from "../src/lib/fhir/token-cache.ts";

// With Upstash unconfigured, cache is a no-op: get returns null, set resolves.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
await setCachedToken("system", "tok-abc", 3600);
const v = await getCachedToken("system");
assert.strictEqual(v, null, "unconfigured cache must return null (no hard dependency)");

console.log("fhir-token-cache test PASSED");
