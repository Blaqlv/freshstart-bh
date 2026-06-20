import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })).newPage();

// Homepage — confirm crisis banner (deepened red) + brand visuals after fixes.
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: "docs/screenshots/p9-home-after.png" });

// Keyboard: first Tab should reveal the skip link with a visible focus ring.
await page.keyboard.press("Tab");
const skip = await page.evaluate(() => {
  const el = document.activeElement;
  return { text: el?.textContent?.trim(), tag: el?.tagName, href: el?.getAttribute?.("href") };
});
console.log("first focus:", JSON.stringify(skip));
await page.screenshot({ path: "docs/screenshots/p9-skiplink-focus.png" });

// Tab a few more times and confirm focus stays visible / moves through nav.
for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
const focused = await page.evaluate(() => document.activeElement?.textContent?.trim()?.slice(0, 40));
console.log("focus after 5 tabs:", focused);
await browser.close();
