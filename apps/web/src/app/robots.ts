import type { MetadataRoute } from "next";

import { DEFAULT_LOCALE, LOCALES } from "@/features/locale/constants";
import { absoluteUrl } from "@/lib/site";

const PRIVATE_PATHS = ["/quan-tri", "/api/", "/cong-cu-ai", "/bao-cao-cua-toi"];

const LOCALIZED_PRIVATE_PATHS = LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
).flatMap((locale) => [`/${locale}/cong-cu-ai`, `/${locale}/bao-cao-cua-toi`]);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_PATHS, ...LOCALIZED_PRIVATE_PATHS],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
