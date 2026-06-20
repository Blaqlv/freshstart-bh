import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
// Mobile viewport — the brief requires the intake to be mobile-friendly.
const ctx = await browser.newContext({ viewport: { width: 400, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const cont = async () => {
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('button:has-text("Save & continue")'),
  ]);
  await page.waitForTimeout(300);
};

// 1. Start intake.
await page.goto(base + "/intake", { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', "newpatient@example.com");
await Promise.all([
  page.waitForURL(/\/intake\/form$/, { timeout: 30000 }),
  page.click('button:has-text("Begin intake")'),
]);
await page.waitForTimeout(400);
await page.screenshot({ path: "docs/screenshots/p7-step-demographics.png", fullPage: true });
const hasResume = (await page.locator("text=resume code").count()) > 0;
console.log("resume code shown:", hasResume);

// Step 1 — Demographics
await page.fill('input[name="fullName"]', "Alex Newpatient");
await page.fill('input[name="dob"]', "1992-03-08");
await page.fill('input[name="phone"]', "937-555-0144");
await page.fill('input[name="address1"]', "100 Main St");
await page.fill('input[name="city"]', "Dayton");
await page.fill('input[name="state"]', "OH");
await page.fill('input[name="zip"]', "45415");
await cont();

// Step 2 — Insurance (nothing required)
await page.fill('input[name="insuranceProvider"]', "Anthem");
await page.fill('input[name="memberId"]', "XYZ123456");
await cont();

// Step 3 — Medical history
await page.fill('textarea[name="medications"]', "None");
await page.fill('textarea[name="allergies"]', "Penicillin");
await cont();

// Step 4 — Mental health (concerns + priorTreatment required)
await page.fill('textarea[name="concerns"]', "Anxiety and trouble sleeping.");
await page.check('input[name="priorTreatment"][value="No"]');
await cont();

// Step 5 — Emergency contact
await page.fill('input[name="emergencyName"]', "Jamie Newpatient");
await page.fill('input[name="emergencyRelationship"]', "Spouse");
await page.fill('input[name="emergencyPhone"]', "937-555-0145");
await cont();

// Step 6 — Consents
await page.check('input[name="consentTreatment"]');
await page.check('input[name="consentHipaa"]');
await page.check('input[name="consentFinancial"]');
await cont();

// Step 7 — Review & sign
await page.waitForTimeout(300);
await page.screenshot({ path: "docs/screenshots/p7-review.png", fullPage: true });
await page.fill('input[name="signedName"]', "Alex Newpatient");
await page.check('input[name="attest"]');
await Promise.all([
  page.waitForURL(/\/intake\/complete$/, { timeout: 30000 }),
  page.click('button:has-text("Submit intake")'),
]);
await page.waitForTimeout(400);
await page.screenshot({ path: "docs/screenshots/p7-complete.png", fullPage: true });
console.log("submitted:", (await page.locator("text=intake is submitted").count()) > 0);

// 2. Admin review — desktop.
const admin = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const ap = await admin.newPage();
await ap.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
await ap.fill("#email", "admin@freshstartbh.test");
await ap.fill("#password", "ChangeMe123!");
await Promise.all([
  ap.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }),
  ap.click('button[type="submit"]'),
]);
await ap.goto(base + "/admin/intake", { waitUntil: "domcontentloaded" });
await ap.waitForTimeout(400);
await ap.screenshot({ path: "docs/screenshots/p7-admin-queue.png", fullPage: true });
await ap.click("table tbody tr td a");
await ap.waitForURL(/\/admin\/intake\/[^/]+$/, { timeout: 30000 });
await ap.waitForTimeout(400);
await ap.screenshot({ path: "docs/screenshots/p7-admin-detail.png", fullPage: true });
console.log("admin sees signature:", (await ap.locator("text=Electronic signature").count()) > 0);

await ctx.close();
await admin.close();
await browser.close();
console.log("done");
