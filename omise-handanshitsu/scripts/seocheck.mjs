// SEO の基本チェック（/seo page 相当）：title 一意・description・canonical・JSON-LD・h1・noindex・sitemap・robots。
// 使い方: BASE_URL=http://localhost:3000 node scripts/seocheck.mjs
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const routes = JSON.parse(await readFile(path.resolve("config/routes.json"), "utf8"));
const RESULT = "/check/result?st=OPERATING&bt=FOOD&rm=MIXED&op=MOST&oc=SIMPLE&sc=SOLO&rr=MEDIUM&ex=NONE&nc=ENOUGH";

const pick = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};
const rows = [];
const titles = new Map();
let problems = 0;

for (const r of [...routes.public_routes, RESULT]) {
  const res = await fetch(BASE + r);
  const html = await res.text();
  const title = pick(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = pick(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = pick(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const robots = pick(html, /<meta\s+name="robots"\s+content="([^"]*)"/i);
  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try {
      const d = JSON.parse(m[1]);
      return d["@type"] ?? (d["@graph"] ? d["@graph"].map((x) => x["@type"]).join("+") : "?");
    } catch {
      return "INVALID";
    }
  });
  const isResult = r.startsWith("/check/result");
  const issues = [];
  if (!title) issues.push("no title");
  if (!description && !isResult) issues.push("no description");
  if (!canonical && !isResult) issues.push("no canonical");
  if (h1 !== 1) issues.push(`h1=${h1}`);
  if (jsonld.includes("INVALID")) issues.push("invalid json-ld");
  if (isResult && !/noindex/.test(robots ?? "")) issues.push("result page must be noindex");
  if (title) titles.set(title, (titles.get(title) ?? 0) + 1);
  if (res.status !== 200) issues.push(`status ${res.status}`);
  problems += issues.length;
  rows.push({ route: r, status: res.status, title, description: description?.slice(0, 60), canonical, robots, h1, jsonld, issues });
  console.log(`${issues.length ? "✗" : "✓"} ${r} [${jsonld.join(",")}] ${issues.join("; ")}`);
}
for (const [t, n] of titles) if (n > 1) {
  problems++;
  console.log(`✗ duplicate title: ${t} ×${n}`);
}

const sm = await fetch(BASE + "/sitemap.xml");
const smText = await sm.text();
const smUrls = [...smText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const rb = await fetch(BASE + "/robots.txt");
const rbText = await rb.text();
console.log(`sitemap.xml: ${sm.status}, ${smUrls.length} urls; robots.txt: ${rb.status}`);
if (sm.status !== 200 || smUrls.length < routes.public_routes.length) {
  problems++;
  console.log("✗ sitemap incomplete");
}
if (!/Sitemap:/.test(rbText)) {
  problems++;
  console.log("✗ robots.txt has no Sitemap line");
}
if (smUrls.some((u) => u.includes("/check/result"))) {
  problems++;
  console.log("✗ sitemap contains result page");
}

await mkdir("docs/qa", { recursive: true });
await writeFile(path.resolve("docs/qa/seo-report.json"), JSON.stringify({ base: BASE, pages: rows, sitemap: smUrls, robots: rbText }, null, 2));
console.log(`\nproblems: ${problems}`);
process.exit(problems ? 1 : 0);
