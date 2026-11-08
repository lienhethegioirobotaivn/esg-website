import type { Metadata } from "next";

import { ABOUT_PATH } from "@/features/about/constants";
import { NewsView, getPosts } from "@/features/about";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tin tức và kiến thức ESG",
  description:
    "Tin tức, kiến thức và hướng dẫn về ESG, báo cáo bền vững, môi trường, xã hội và quản trị dành cho doanh nghiệp.",
  path: `${ABOUT_PATH}/tin-tuc`,
});

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await getPosts("tin-tuc");
  return <NewsView posts={posts} />;
}
