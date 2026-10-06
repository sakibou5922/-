// 3つの幅（スマホ 375 / タブレット 768 / PC 1440）で主要ページを撮影し、横はみ出しを検出する。
// 使い方: BASE_URL=http://localhost:3000 node scripts/screenshots.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BASE, QA_DIR, writeReport } from "./_common.mjs";

const OUT = path.join(QA_DIR, "screenshots");
const WIDTHS = [
  { name: "sp", width: 375, height: 812, mobile: true },
  { name: "tb", width: 768, height: 1024, mobile: true },
  { name: "pc", width: 1440, height: 900, mobile: false },
];
const RESULT =
  "/check/result?st=OPERATING&bt=BEAUTY_SALON&rm=APPOINTMENT_DOMINANT&op=MOST&oc=SIMPLE&sc=SMALL_2_3&rr=HIGH&ex=GOOGLE_BUSINESS&nc=NEED_MORE&from=RESERVATION"; // 「気になっていたもの」付き
const PAGES = [
  ["top", "/"],
  ["check", "/check"],
  ["result", RESULT],
  ["need-index", "/need"],
  ["article-reservation", "/need/reservation-system"],
  ["article-cashless", "/need/cashless-payment"],
  ["opening-order", "/guide/opening-order"],
  ["advertising-policy", "/advertising-policy"],
  ["not-found", "/this-page-does-not-exist"],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const report = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    isMobile: w.mobile,
    hasTouch: w.mobile,
    deviceScaleFactor: 1,
    locale: "ja-JP",
  });
  const page = await ctx.newPage();
  for (const [name, url] of PAGES) {
    const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = doc.scrollWidth > doc.clientWidth + 1;
      const offenders = [];
      if (over) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 && r.width > 0) {
            offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} right=${Math.round(r.right)}`);
            if (offenders.length >= 5) break;
          }
        }
      }
      return { over, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
    });
    const file = path.join(OUT, `${name}-${w.name}-${w.width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.push({ page: name, url, width: w.width, status: res?.status(), horizontalOverflow: overflow.over, offenders: overflow.offenders, file: path.relative(process.cwd(), file) });
    console.log(`${overflow.over ? "✗ OVERFLOW" : "✓"} ${name} @${w.width} (${res?.status()}) → ${path.basename(file)}`);
  }
  await ctx.close();
}
await browser.close();
await writeReport("screenshots-report.json", report);
const bad = report.filter((r) => r.horizontalOverflow);
console.log(`\n${report.length} shots, ${bad.length} with horizontal overflow`);
process.exit(bad.length ? 1 : 0);
