import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// 1. Submit appointment request
await page.goto(base + "/contact", { waitUntil: "domcontentloaded" });
await page.fill('input[name="name"]', "Jordan Test");
await page.fill('input[name="phone"]', "937-555-0101");
await page.fill('input[name="email"]', "jordan.test@example.com");
await page.selectOption('select[name="location"]', { index: 1 });
await page.selectOption('select[name="service"]', { index: 1 });
await page.check('input[name="consent"]');
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: "docs/screenshots/p4-appointment-success.png", fullPage: true });
console.log("appointment submitted:", (await page.locator("text=Thank you").count()) > 0);

// 2. Submit insurance verification
await page.goto(base + "/insurance/verify", { waitUntil: "domcontentloaded" });
await page.fill('input[name="name"]', "Jordan Test");
await page.fill('input[name="dob"]', "1990-04-15");
await page.selectOption('select[name="provider"]', { index: 1 });
await page.fill('input[name="memberId"]', "ABC123456789");
await page.check('input[name="consent"]');
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);
console.log("insurance submitted:", (await page.locator("text=received securely").count()) > 0);

// 3. Admin login + queue + decrypted detail
await page.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
await page.fill("#email", "admin@freshstartbh.test");
await page.fill("#password", "ChangeMe123!");
await Promise.all([
  page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
await page.goto(base + "/admin/submissions", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
await page.screenshot({ path: "docs/screenshots/p4-admin-queue.png", fullPage: true });

// open first submission
await page.click("table tbody tr td a");
await page.waitForURL(/\/admin\/submissions\/[^/]+$/, { timeout: 30000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "docs/screenshots/p4-admin-detail.png", fullPage: true });

// audit log
await page.goto(base + "/admin/audit", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
await page.screenshot({ path: "docs/screenshots/p4-admin-audit.png", fullPage: true });

await ctx.close();
await browser.close();
console.log("done");
