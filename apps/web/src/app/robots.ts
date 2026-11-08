import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/quan-tri", "/api/", "/cong-cu-ai"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
