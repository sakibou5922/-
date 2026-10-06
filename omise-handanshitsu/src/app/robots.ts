import type { MetadataRoute } from "next";
import { NOINDEX_PATTERNS, absoluteUrl, isPublicRelease } from "@/lib/site";

export function buildRobots(publicRelease: boolean): MetadataRoute.Robots {
  const disallow = NOINDEX_PATTERNS.map((p) => (p.endsWith("*") ? p.slice(0, -1) : p));
  return {
    rules: publicRelease
      ? [{ userAgent: "*", allow: "/", disallow }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots(isPublicRelease());
}
