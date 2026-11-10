import type { Metadata } from "next";

import { ABOUT_PATH } from "@/features/about/constants";
import { NewsView, getPosts } from "@/features/about";
import { getLocale, getT } from "@/features/locale/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Tin tức và kiến thức ESG"),
    description: t(
      "Tin tức, kiến thức và hướng dẫn về ESG, báo cáo bền vững, môi trường, xã hội và quản trị dành cho doanh nghiệp.",
    ),
    path: `${ABOUT_PATH}/tin-tuc`,
    locale: await getLocale(),
  });
}

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await getPosts("tin-tuc", await getLocale());
  return <NewsView posts={posts} />;
}
