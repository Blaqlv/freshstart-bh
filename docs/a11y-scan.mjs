import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("docs", { recursive: true });
const base = "http://localhost:3000";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const publicRoutes = [
  "/",
  "/about",
  "/about/leadership",
  "/about/accreditation",
  "/services",
  "/services/psychiatry",
  "/providers",
  "/providers/irfan-dahar",
  "/locations",
  "/locations/dayton-main",
  "/insurance",
  "/insurance/verify",
  "/resources/blog",
  "/resources/blog/understanding-anxiety",
  "/resources/frequently-asked-questions",
  "/reviews",
  "/reviews/leave-a-review",
  "/contact",
  "/careers",
  "/accessibility",
  "/compliance",
  "/crisis-support",
  "/privacy/privacy-policy",
  "/privacy/notice-of-privacy-practices",
  "/admin/login",
  "/patient-portal/login",
  "/intake",
  "/intake/resume",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const results = [];
async function scan(route, label) {
  await page.goto(base + route, { waitUntil: "networkidle" });
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const critical = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  results.push({
    route: label ?? route,
    violations: r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      sample: v.nodes[0]?.target?.join(" ") ?? "",
    })),
    criticalCount: critical.length,
  });
  const flag = critical.length ? `❌ ${critical.length} critical/serious` : "✓";
  console.log(`${flag}  ${label ?? route}` + (r.violations.length ? `  (${r.violations.length} total)` : ""));
}

for (const route of publicRoutes) await scan(route);

// Authenticated: patient portal.
await page.goto(base + "/patient-portal/login", { waitUntil: "domcontentloaded" });
await page.fill("#email", "patient@freshstartbh.test");
await page.fill("#password", "ChangeMe123!");
await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login")), page.click('button[type="submit"]')]);
for (const r of ["/patient-portal", "/patient-portal/appointments", "/patient-portal/messages", "/patient-portal/billing", "/patient-portal/security"]) await scan(r);

// Authenticated: admin + dashboard.
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
await page2.fill("#email", "admin@freshstartbh.test");
await page2.fill("#password", "ChangeMe123!");
await Promise.all([page2.waitForURL((u) => !u.pathname.endsWith("/login")), page2.click('button[type="submit"]')]);
for (const route of ["/admin", "/admin/pages", "/admin/submissions", "/admin/users", "/dashboard"]) {
  await page2.goto(base + route, { waitUntil: "networkidle" });
  const rr = await new AxeBuilder({ page: page2 }).withTags(TAGS).analyze();
  const critical = rr.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  results.push({ route, violations: rr.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(" ") ?? "" })), criticalCount: critical.length });
  console.log(`${critical.length ? `❌ ${critical.length} critical/serious` : "✓"}  ${route}` + (rr.violations.length ? `  (${rr.violations.length} total)` : ""));
}

const totalCritical = results.reduce((s, r) => s + r.criticalCount, 0);
const allIds = [...new Set(results.flatMap((r) => r.violations.map((v) => `${v.id} [${v.impact}]`)))];
writeFileSync("docs/a11y-report.json", JSON.stringify(results, null, 2));
console.log("\n=== Summary ===");
console.log("routes scanned:", results.length);
console.log("total critical/serious:", totalCritical);
console.log("unique rule violations:", allIds.length ? allIds.join(", ") : "none");

await ctx.close();
await ctx2.close();
await browser.close();
process.exit(totalCritical > 0 ? 1 : 0);
