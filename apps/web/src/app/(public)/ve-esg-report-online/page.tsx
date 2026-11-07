import type { Metadata } from "next";

import {
  AchievementsView,
  StatsBand,
  getAchievementStats,
  getPosts,
} from "@/features/about";

export const metadata: Metadata = {
  title: "Thành tựu",
};

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const [stats, posts] = await Promise.all([
    getAchievementStats(),
    getPosts("thanh-tuu"),
  ]);

  return (
    <>
      <h1 className="text-4xl font-bold text-primary-800">
        Thành tựu &amp; tác động
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
