import { msg } from "@/features/locale/lib/translate";

export const SITE_NAME = "ESG Report Online";
export const SITE_TAGLINE = msg("Tạo báo cáo ESG miễn phí cho doanh nghiệp");
export const SITE_DESCRIPTION = msg(
  "Nền tảng tạo báo cáo ESG nội bộ miễn phí cho doanh nghiệp chuẩn EU. Điền thông tin, thêm minh chứng và tải về báo cáo ESG của bạn.",
);
export const SITE_LOCALE = "vi_VN";
export const DEFAULT_OG_IMAGE = "/og-default.png";
export const SITE_LOGO = "/logo-min-color.png";

const LOCAL_URL = "http://localhost:3000";

function normalizeUrl(value: string): string {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const explicit = process.env["NEXT_PUBLIC_SITE_URL"]?.trim();
  if (explicit) {
    return normalizeUrl(explicit);
  }
  const vercel = process.env["VERCEL_PROJECT_PRODUCTION_URL"]?.trim();
  if (vercel) {
    return normalizeUrl(vercel);
  }
  return LOCAL_URL;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path === "/" || path === "") {
    return getSiteUrl();
  }
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateText(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) {
    return clean;
  }
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
