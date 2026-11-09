import { getT } from "@/features/locale/server";

import type { AchievementStats } from "../types";

export async function StatsBand({ stats }: { stats: AchievementStats }) {
  const t = await getT();
  return (
    <div>
      <dl className="grid grid-cols-2 gap-y-6 rounded-2xl bg-linear-to-br from-primary-800 to-primary-900 px-4 py-8 text-white lg:grid-cols-4 lg:py-10">
        {stats.items.map((stat, index) => (
          <div
            key={stat.id}
            className={
              index > 0
                ? "px-6 lg:border-l lg:border-white/20"
                : "px-6"
            }
          >
            <dd className="font-serif text-5xl font-bold leading-none lg:text-6xl">
              {stat.value}
            </dd>
            <dt className="mt-3 max-w-40 text-lg leading-snug text-white/90">
              {t(stat.label)}
            </dt>
          </div>
        ))}
      </dl>
      {stats.isSample ? (
        <p className="mt-2 text-xs italic text-subtle">{t("Số liệu minh họa")}</p>
      ) : null}
    </div>
  );
}
