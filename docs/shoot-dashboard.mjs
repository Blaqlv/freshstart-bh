import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Admin (has dashboard:read) → can view.
await page.goto(base + "/admin/login?next=/dashboard", { waitUntil: "domcontentloaded" });
await page.fill("#email", "admin@freshstartbh.test");
await page.fill("#password", "ChangeMe123!");
await Promise.all([
  page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
await page.goto(base + "/dashboard", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
await page.screenshot({ path: "docs/screenshots/p8-dashboard.png", fullPage: true });
console.log("admin sees KPIs:", (await page.locator("text=Appointment requests").count()) > 0);
console.log("CARF panel:", (await page.locator("text=CARF performance indicators").count()) > 0);

// Receptionist (NO dashboard:read) → blocked at the data layer.
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
await p2.fill("#email", "front-desk@freshstartbh.test");
await p2.fill("#password", "ChangeMe123!");
await Promise.all([
  p2.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }),
  p2.click('button[type="submit"]'),
]);
const resp = await p2.goto(base + "/dashboard", { waitUntil: "domcontentloaded" });
const blocked = (resp?.status() ?? 0) >= 400;
const noKpis = (await p2.locator("text=Appointment requests").count()) === 0;
console.log("receptionist blocked from dashboard:", blocked && noKpis, "(status", resp?.status() + ")");

await ctx.close();
await ctx2.close();
await browser.close();
console.log("done");
