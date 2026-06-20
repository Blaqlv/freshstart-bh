import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// 0. Protected route redirects to login when unauthenticated.
await page.goto(base + "/patient-portal/billing", { waitUntil: "domcontentloaded" });
const redirected = page.url().includes("/patient-portal/login");
console.log("unauth redirect to login:", redirected);

// 1. Patient login (no MFA on the demo account).
await page.fill("#email", "patient@freshstartbh.test");
await page.fill("#password", "ChangeMe123!");
await Promise.all([
  page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
await page.goto(base + "/patient-portal", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.screenshot({ path: "docs/screenshots/p6-dashboard.png", fullPage: true });
console.log("dashboard loaded:", (await page.locator("text=Welcome back").count()) > 0);

// 2. Request an appointment.
await page.goto(base + "/patient-portal/appointments", { waitUntil: "domcontentloaded" });
await page.fill('input[name="scheduledAt"]', "2026-07-15T10:30");
await page.selectOption('select[name="locationId"]', { index: 1 });
await page.selectOption('select[name="serviceSlug"]', { index: 1 });
await page.fill('textarea[name="reason"]', "Follow-up visit");
await page.click('button:has-text("Request appointment")');
await page.waitForTimeout(1000);
await page.screenshot({ path: "docs/screenshots/p6-appointments.png", fullPage: true });
console.log("appointment count:", await page.locator("text=requested").count());

// 3. Open the seeded message thread and reply.
await page.goto(base + "/patient-portal/messages", { waitUntil: "domcontentloaded" });
await page.click("text=Welcome to your portal");
await page.waitForURL(/\/patient-portal\/messages\/[^/]+$/, { timeout: 30000 });
await page.fill('textarea[name="body"]', "Thank you! Looking forward to my visit.");
await page.click('button:has-text("Send reply")');
await page.waitForTimeout(1000);
await page.screenshot({ path: "docs/screenshots/p6-message-thread.png", fullPage: true });

// 4. Refills (seeded one shown).
await page.goto(base + "/patient-portal/refills", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await page.screenshot({ path: "docs/screenshots/p6-refills.png", fullPage: true });

// 5. Billing (read-only).
await page.goto(base + "/patient-portal/billing", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await page.screenshot({ path: "docs/screenshots/p6-billing.png", fullPage: true });

// 6. Security / MFA enrollment.
await page.goto(base + "/patient-portal/security", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await page.screenshot({ path: "docs/screenshots/p6-security.png", fullPage: true });
console.log("MFA QR present:", (await page.locator('img[alt="MFA QR code"]').count()) > 0);

await ctx.close();
await browser.close();
console.log("done");
