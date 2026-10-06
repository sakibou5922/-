/**
 * SEO の純粋関数（sitemap / robots / 構造化データ）。app/sitemap.ts と app/robots.ts はここを呼ぶだけ。
 */
import type { MetadataRoute } from "next";
import { getArticle } from "./content/articles";
import { REGISTRY_VERIFIED_AT } from "./evidence";
import { BRAND, NOINDEX_PREFIXES, PUBLIC_ROUTES, absoluteUrl, isNoindexPath } from "./site";

export const ORGANIZATION_ID = `${absoluteUrl("/")}#organization`;

export function buildSitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.filter((r) => !isNoindexPath(r)).map((r) => {
    const article = r.startsWith("/need/") ? getArticle(r.slice("/need/".length)) : undefined;
    return {
      url: absoluteUrl(r),
      lastModified: article?.reviewedAt ?? REGISTRY_VERIFIED_AT,
      changeFrequency: r === "/" || r.startsWith("/need") ? "weekly" : "monthly",
      priority: r === "/" ? 1 : r === "/check" ? 0.9 : r.startsWith("/need/") ? 0.8 : 0.5,
    };
  });
}

/** 公開前は全拒否。公開後は結果ページ（noindex パターン）だけ拒否 */
export function buildRobots(publicRelease: boolean): MetadataRoute.Robots {
  return {
    rules: publicRelease ? [{ userAgent: "*", allow: "/", disallow: NOINDEX_PREFIXES }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": ORGANIZATION_ID, name: BRAND.brand_name, url: absoluteUrl("/") },
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl("/")}#website`,
        name: BRAND.brand_name,
        url: absoluteUrl("/"),
        inLanguage: "ja",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export function articleJsonLd(input: {
  headline: string;
  description?: string;
  path: string;
  published: string;
  modified: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    inLanguage: "ja",
    datePublished: input.published,
    dateModified: input.modified,
    mainEntityOfPage: absoluteUrl(input.path),
    author: { "@type": "Organization", name: BRAND.brand_name },
    publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: BRAND.brand_name, url: absoluteUrl("/") },
  };
}
