// サイト内リンク切れチェック（lychee 相当・内部のみ。--external で外部も HEAD）。
// 使い方: BASE_URL=http://localhost:3000 node scripts/linkcheck.mjs [--external]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EXTERNAL = process.argv.includes("--external");
const origin = new URL(BASE).origin;

const queue = ["/"];
const seen = new Set(queue);
const internal = [];
const external = new Map();

function extractLinks(html) {
  const out = [];
  const re = /<a\s[^>]*href=["']([^"'#]+)(?:#[^"']*)?["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

while (queue.length) {
  const p = queue.shift();
  const res = await fetch(BASE + p, { redirect: "manual" });
  const html = res.headers.get("content-type")?.includes("text/html") ? await res.text() : "";
  internal.push({ path: p, status: res.status });
  if (res.status >= 400) console.log(`✗ ${res.status} ${p}`);
  for (const href of extractLinks(html)) {
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    let u;
    try {
      u = new URL(href, BASE);
    } catch {
      continue;
    }
    if (u.origin === origin) {
      const key = u.pathname + u.search;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(key);
      }
    } else {
      external.set(u.href, (external.get(u.href) ?? 0) + 1);
    }
  }
}

const ext = [];
if (EXTERNAL) {
  for (const [href] of external) {
    try {
      const r = await fetch(href, { method: "HEAD", redirect: "follow" });
      ext.push({ href, status: r.status });
      console.log(`${r.status >= 400 ? "✗" : "✓"} ${r.status} ${href}`);
    } catch (e) {
      ext.push({ href, status: 0, error: String(e) });
      console.log(`? ${href} (${e})`);
    }
  }
}

await mkdir("docs/qa", { recursive: true });
await writeFile(path.resolve("docs/qa/linkcheck-report.json"), JSON.stringify({ base: BASE, internal, external: EXTERNAL ? ext : [...external.keys()] }, null, 2));
const broken = internal.filter((x) => x.status >= 400).length + ext.filter((x) => x.status >= 400 || x.status === 0).length;
console.log(`\ninternal pages: ${internal.length}, external links: ${external.size}, broken: ${broken}`);
process.exit(broken ? 1 : 0);
