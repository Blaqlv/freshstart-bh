/**
 * A1 step 7 — consent gating test.
 *
 * Asserts GTM is ABSENT before consent and PRESENT after "Accept All". Matches
 * the repo's existing Playwright-script style (docs/shoot-*.mjs) rather than a
 * test-runner. Run against a dev server:
 *
 *   npx playwright install chromium   # once
 *   npm run dev                        # in another terminal
 *   node tests/consent.gtm.mjs
 */
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const gtmSelector = 'script#gtm, script[src*="googletagmanager.com/gtm.js"]';

const browser = await chromium.launch();
const ctx = await browser.newContext(); // fresh storage — no prior consent
const page = await ctx.newPage();

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });

// Before consent: GTM must not be present.
if ((await page.locator(gtmSelector).count()) !== 0) {
  fail("GTM script present before consent was granted");
} else {
  console.log("OK: GTM absent before consent");
}

// Grant consent.
await page.getByRole("button", { name: "Accept All" }).click();
await page.waitForTimeout(1000);

// After consent: GTM must load.
if ((await page.locator(gtmSelector).count()) > 0) {
  console.log("OK: GTM present after Accept All");
} else {
  fail("GTM script missing after Accept All");
}

await ctx.close();
await browser.close();
console.log(process.exitCode ? "consent test FAILED" : "consent test PASSED");
