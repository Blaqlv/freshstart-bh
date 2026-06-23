import { readFileSync } from "node:fs";
import { marked } from "marked";
import { chromium } from "playwright";

const inPath = process.argv[2] ?? "USER-GUIDE.md";
const outPath = process.argv[3] ?? "USER-GUIDE.pdf";

const md = readFileSync(inPath, "utf8");
const body = marked.parse(md);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>
  @page { margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #1f2933; font-size: 11pt; line-height: 1.5; margin: 0;
  }
  h1 { color: #31585d; font-size: 22pt; border-bottom: 3px solid #4ba5aa;
       padding-bottom: 6px; margin: 0 0 4px; }
  h2 { color: #31585d; font-size: 15pt; margin: 26px 0 8px;
       border-bottom: 1px solid #d6e4e5; padding-bottom: 4px; }
  h3 { color: #31585d; font-size: 12.5pt; margin: 18px 0 6px; }
  p, li { margin: 6px 0; }
  em { color: #52606d; }
  a { color: #31585d; text-decoration: none; }
  code { background: #eef4f4; padding: 1px 5px; border-radius: 4px;
         font-family: "Consolas", monospace; font-size: 9.5pt; color: #31585d; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
  th { background: #31585d; color: #fff; text-align: left; padding: 7px 10px; }
  td { border: 1px solid #d6e4e5; padding: 7px 10px; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f9f9; }
  blockquote { border-left: 4px solid #4ba5aa; background: #f5f9f9;
               margin: 12px 0; padding: 8px 14px; color: #334155; }
  hr { border: none; border-top: 1px solid #d6e4e5; margin: 22px 0; }
  h2, h3 { break-after: avoid; }
  table, blockquote { break-inside: avoid; }

  /* Title page */
  .cover { break-after: page; height: 247mm; display: flex; flex-direction: column;
           justify-content: center; text-align: center; }
  .cover .logo { display: flex; align-items: center; justify-content: center;
                 gap: 16px; margin-bottom: 48px; }
  .cover .mark { width: 88px; height: 88px; border-radius: 50%;
                 background: #31585d; color: #fff; font-weight: 700; font-size: 34pt;
                 display: flex; align-items: center; justify-content: center; }
  .cover .wordmark { text-align: left; line-height: 1.1; }
  .cover .wordmark .name { display: block; color: #31585d; font-weight: 700; font-size: 24pt; }
  .cover .wordmark .sub { display: block; color: #52606d; font-weight: 600; font-size: 11pt;
                          letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .cover h1.title { border: none; font-size: 30pt; color: #31585d; margin: 0 0 10px; padding: 0; }
  .cover .rule { width: 90px; height: 4px; background: #4ba5aa; margin: 18px auto 22px; border-radius: 2px; }
  .cover .tagline { color: #52606d; font-size: 13pt; font-style: italic; margin: 0 auto; max-width: 130mm; }
  .cover .meta { margin-top: 64px; color: #52606d; font-size: 10.5pt; }
  .cover .confidential { margin-top: 10px; font-size: 9pt; color: #94a3b8;
                         text-transform: uppercase; letter-spacing: 1.5px; }
</style></head><body>
  <section class="cover">
    <div class="logo">
      <div class="mark">FS</div>
      <div class="wordmark">
        <span class="name">Fresh Start</span>
        <span class="sub">Behavioral Health</span>
      </div>
    </div>
    <h1 class="title">Platform User Guide</h1>
    <div class="rule"></div>
    <p class="tagline">Your new website and staff platform &mdash; a plain-language guide for the people who run it day to day.</p>
    <div class="meta">
      Prepared ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      <div class="confidential">Confidential &mdash; for Fresh Start Behavioral Health</div>
    </div>
  </section>
${body}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:8pt;color:#94a3b8;padding:0 18mm;text-align:right;">' +
    'Fresh Start Behavioral Health — Platform User Guide &nbsp;·&nbsp; ' +
    'Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
});
await browser.close();
console.log("Wrote " + outPath);
