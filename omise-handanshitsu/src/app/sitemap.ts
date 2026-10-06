import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, absoluteUrl, isNoindexPath, siteUrl } from "@/lib/site";

export const LAST_MODIFIED = "2026-10-06";

export function buildSitemap(routes: string[] = PUBLIC_ROUTES): MetadataRoute.Sitemap {
  return routes
    .filter((r) => !isNoindexPath(r))
    .map((r) => ({
      // ルートは canonical（Next が末尾スラッシュを落とす）と揃えて末尾スラッシュなし
      url: r === "/" ? siteUrl() : absoluteUrl(r),
      lastModified: LAST_MODIFIED,
      changeFrequency: r === "/" || r.startsWith("/need") ? "weekly" : "monthly",
      priority: r === "/" ? 1 : r === "/check" ? 0.9 : r.startsWith("/need/") ? 0.8 : 0.5,
    }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
