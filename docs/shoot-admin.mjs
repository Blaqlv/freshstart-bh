import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function shot(name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `docs/screenshots/admin-${name}.png`, fullPage: true });
  console.log("saved admin-" + name, "(url:", page.url() + ")");
}

// Login
await page.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
await page.fill("#email", "admin@freshstartbh.test");
await page.fill("#password", "ChangeMe123!");
await Promise.all([
  page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
await shot("dashboard");

// Pages list
await page.goto(base + "/admin/pages", { waitUntil: "domcontentloaded" });
await shot("pages-list");

// Open the seeded Home page editor
await page.click("text=Home");
await page.waitForURL(/\/admin\/pages\/[^/]+$/, { timeout: 30000 });
await shot("page-editor");

// Preview the draft (preview link opens new tab; navigate directly instead)
const editorUrl = page.url();
await page.goto(editorUrl + "/preview", { waitUntil: "domcontentloaded" });
await shot("page-preview");

// Testimonials + providers
await page.goto(base + "/admin/testimonials", { waitUntil: "domcontentloaded" });
await shot("testimonials");
await page.goto(base + "/admin/providers", { waitUntil: "domcontentloaded" });
await shot("providers");

await ctx.close();
await browser.close();
console.log("done");
