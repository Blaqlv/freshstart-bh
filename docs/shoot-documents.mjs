import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/screenshots", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Login.
await page.goto(base + "/patient-portal/login", { waitUntil: "domcontentloaded" });
await page.fill("#email", "patient@freshstartbh.test");
await page.fill("#password", "ChangeMe123!");
await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login")), page.click('button[type="submit"]')]);

// 1. Upload a CLEAN file.
const cleanBody = Buffer.from("%PDF-1.4\nFresh Start test document — hello world\n%%EOF");
await page.goto(base + "/patient-portal/documents", { waitUntil: "domcontentloaded" });
await page.setInputFiles('input[type="file"]', { name: "lab-results.pdf", mimeType: "application/pdf", buffer: cleanBody });
await Promise.all([page.waitForLoadState("networkidle"), page.click('button:has-text("Upload document")')]);
await page.waitForTimeout(600);
const cleanShown = (await page.locator("text=lab-results.pdf").count()) > 0;
const downloadLink = await page.locator('a:has-text("Download")').first().getAttribute("href");
console.log("clean upload listed:", cleanShown, "| download link:", !!downloadLink);
await page.screenshot({ path: "docs/screenshots/p11-documents.png", fullPage: true });

// 2. Download it and confirm the decrypted bytes round-trip exactly.
const res = await page.context().request.get(base + downloadLink);
const dl = Buffer.from(await res.body());
console.log("download status:", res.status(), "| bytes match original:", dl.equals(cleanBody));

// 3. Upload an EICAR test file — must be rejected, not stored.
const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
await page.setInputFiles('input[type="file"]', { name: "invoice.pdf", mimeType: "application/pdf", buffer: eicar });
await Promise.all([page.waitForLoadState("networkidle"), page.click('button:has-text("Upload document")')]);
await page.waitForTimeout(500);
const rejected = (await page.locator("text=failed a virus scan").count()) > 0;
const eicarNotListed = (await page.locator("text=invoice.pdf").count()) === 0;
console.log("EICAR rejected:", rejected, "| not stored:", eicarNotListed);

// 4. Delete the clean doc.
await Promise.all([page.waitForLoadState("networkidle"), page.click('button:has-text("Delete")')]);
await page.waitForTimeout(400);
console.log("after delete, doc gone from list:", (await page.locator("text=lab-results.pdf").count()) === 0);

await ctx.close();
await browser.close();
console.log("done");
