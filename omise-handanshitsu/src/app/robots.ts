import type { MetadataRoute } from "next";
import { buildRobots } from "@/lib/seo";
import { isPublicRelease } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(isPublicRelease());
}
