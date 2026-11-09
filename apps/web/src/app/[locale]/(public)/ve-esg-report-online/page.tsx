import type { Metadata } from "next";

import { ABOUT_PATH } from "@/features/about/constants";
import { getT } from "@/features/locale/server";
import { pageMetadata } from "@/lib/seo";

import {
  AchievementsView,
  StatsBand,
  getAchievementStats,
  getPosts,
} from "@/features/about";

export const metadata: Metadata = pageMetadata({
  title: "Thành tựu và tác động",
  description:
    "Những dấu mốc, sự kiện và thành tựu của ESG Report Online trong hành trình đồng hành cùng doanh nghiệp Việt Nam xây dựng báo cáo ESG.",
  path: ABOUT_PATH,
});

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const t = await getT();
  const [stats, posts] = await Promise.all([
    getAchievementStats(),
    getPosts("thanh-tuu"),
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
