import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const pages = [
  ["home-cms", "/"],
  ["services-index", "/services"],
  ["service-detail", "/services/mental-health"],
  ["providers", "/providers"],
  ["about", "/about"],
  ["insurance", "/insurance"],
  ["contact", "/contact"],
  ["crisis-support", "/crisis-support"],
  ["blog", "/resources/blog"],
  ["reviews", "/reviews"],
  ["privacy-npp", "/privacy/notice-of-privacy-practices"],
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [name, path] of pages) {
  const res = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `docs/screenshots/p3-${name}.png`, fullPage: true });
  console.log(`p3-${name}: HTTP ${res?.status()}`);
}
await ctx.close();
await browser.close();
console.log("done");
