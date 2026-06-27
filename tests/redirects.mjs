/**
 * B3 — redirect map verification. Asserts every legacy slug returns a 3xx that
 * points at the expected new path. Run against a deployment (preview or local):
 *
 *   BASE_URL=https://your-preview.vercel.app npx tsx tests/redirects.mjs
 *
 * The redirect list is imported from the same module next.config.ts uses, so the
 * test and the config never drift.
 */
import { legacyRedirects } from "../src/lib/redirects.ts";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
let failures = 0;

for (const { source, destination } of legacyRedirects) {
  let res;
  try {
    res = await fetch(base + source, { redirect: "manual" });
  } catch (e) {
    console.error(`FAIL ${source}: request error ${e}`);
    failures++;
    continue;
  }
  const is3xx = res.status >= 300 && res.status < 400;
  const location = res.headers.get("location") ?? "";
  const target = destination.split("#")[0];
  const ok = is3xx && location.split("#")[0].endsWith(target);
  if (ok) {
    console.log(`OK   ${source} -> ${location} (${res.status})`);
  } else {
    console.error(`FAIL ${source}: status ${res.status}, location "${location}", expected ${destination}`);
    failures++;
  }
}

console.log(failures ? `\nredirects test FAILED (${failures})` : "\nredirects test PASSED");
process.exitCode = failures ? 1 : 0;
