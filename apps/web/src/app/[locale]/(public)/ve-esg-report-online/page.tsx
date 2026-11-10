import type { Metadata } from "next";

import { ABOUT_PATH } from "@/features/about/constants";
import { getLocale, getT } from "@/features/locale/server";
import { pageMetadata } from "@/lib/seo";

import {
  AchievementsView,
  StatsBand,
  getAchievementStats,
  getPosts,
} from "@/features/about";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Thành tựu và tác động"),
    description: t(
      "Những dấu mốc, sự kiện và thành tựu của ESG Report Online trong hành trình đồng hành cùng doanh nghiệp Việt Nam xây dựng báo cáo ESG.",
    ),
    path: ABOUT_PATH,
    locale: await getLocale(),
  });
}

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const t = await getT();
  const locale = await getLocale();
  const [stats, posts] = await Promise.all([
    getAchievementStats(locale),
    getPosts("thanh-tuu", locale),
  ]);

  return (
    <>
      <h1 className="text-4xl font-bold text-primary-800">
        {t("Thành tựu & tác động")}
      </h1>
      {stats ? (
        <div className="mt-6">
          <StatsBand stats={stats} />
        </div>
      ) : null}
      <div className="mt-8">
        <AchievementsView posts={posts} />
      </div>
    </>
  );
}
