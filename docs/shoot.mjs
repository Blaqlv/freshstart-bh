import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const pages = [
  ["home", "/"],
  ["service-mental-health", "/services/mental-health"],
  ["locations", "/locations"],
];
const viewports = [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
];

mkdirSync("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
for (const [vname, w, h] of viewports) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [name, path] of pages) {
    await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    const file = `docs/screenshots/${name}-${vname}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file);
  }
  await ctx.close();
}
await browser.close();
