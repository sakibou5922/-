import { describe, expect, it } from "vitest";
import { ARTICLES, articleHref } from "@/lib/content/articles";
import { buildRobots, buildSitemap } from "@/lib/seo";
import { BRAND, PUBLIC_ROUTES, absoluteUrl, isNoindexPath, isPublicRelease, loadFlags, siteUrl } from "@/lib/site";

describe("A24 sitemap / robots / canonical", () => {
  it("sitemap は公開ルートをすべて含み、結果ページを含まない", () => {
    const urls = buildSitemap().map((e) => e.url);
    for (const r of PUBLIC_ROUTES) expect(urls).toContain(absoluteUrl(r));
    expect(absoluteUrl("/")).toBe(siteUrl()); // ルートは canonical と同じ綴り（末尾スラッシュなし）
    expect(urls.some((u) => u.includes("/check/result"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
    for (const a of ARTICLES) expect(urls).toContain(absoluteUrl(articleHref(a.slug)));
  });
  it("robots は公開前は全拒否、公開後は結果ページだけ拒否", () => {
    const pre = buildRobots(false);
    expect(JSON.stringify(pre.rules)).toContain('"disallow":"/"');
    const post = buildRobots(true);
    expect(JSON.stringify(post.rules)).toContain("/check/result");
    expect(post.sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });
  it("noindex パターン", () => {
    expect(isNoindexPath("/check/result")).toBe(true);
    expect(isNoindexPath("/check/result?st=OPERATING")).toBe(true);
    expect(isNoindexPath("/check")).toBe(false);
    expect(isNoindexPath("/need/pos-register")).toBe(false);
  });
  it("site_url は末尾スラッシュなしで、環境変数で上書きできる", () => {
    expect(siteUrl({})).toBe(BRAND.site_url.replace(/\/+$/, ""));
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com/" })).toBe("https://example.com");
  });
});

describe("公開ゲート", () => {
  it("既定では公開扱いにならない（フラグ false かつ brand.public_release false）", () => {
    expect(isPublicRelease(loadFlags({}))).toBe(false);
    expect(isPublicRelease(loadFlags({ FLAG_PUBLIC_RELEASE_ENABLED: "true" }))).toBe(BRAND.public_release);
  });
  it("ブランド名は config で一元管理されている", () => {
    expect(BRAND.brand_name).toBe("お店の判断室");
    expect(BRAND.trademark_clearance).toBe("PENDING");
  });
});
