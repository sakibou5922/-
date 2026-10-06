// axe-core によるアクセシビリティ機械チェック（WCAG 2.1 AA 相当のルール）。
// 使い方: BASE_URL=http://localhost:3000 node scripts/axe.mjs
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { BASE, RESULT_URL as RESULT, writeReport } from "./_common.mjs";

const PAGES = ["/", "/check", RESULT, "/need", "/need/pos-register", "/need/line-official", "/guide/opening-order", "/editorial-policy", "/operator"];
const WIDTHS = [375, 1440];

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const all = [];
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ja-JP" });
  const page = await ctx.newPage();
  for (const url of PAGES) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
    const v = results.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.length, targets: x.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
    all.push({ url, width, violations: v });
    const serious = v.filter((x) => x.impact === "serious" || x.impact === "critical");
    console.log(`${serious.length ? "✗" : "✓"} ${url} @${width}: ${v.length} violations (${serious.length} serious/critical)`);
    for (const x of v) console.log(`    - [${x.impact}] ${x.id}: ${x.help} (${x.nodes}) ${x.targets.join(" | ")}`);
  }
  await ctx.close();
}
await browser.close();
await writeReport("axe-report.json", all);
const seriousTotal = all.flatMap((a) => a.violations).filter((x) => x.impact === "serious" || x.impact === "critical").length;
console.log(`\nserious/critical total: ${seriousTotal}`);
process.exit(seriousTotal ? 1 : 0);
