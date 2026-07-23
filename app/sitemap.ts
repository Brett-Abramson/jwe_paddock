import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /share is excluded: every URL there is a one-off user-generated build link
// (noindex'd in its own metadata), not a page worth crawlers discovering.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/states`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
