import type { Metadata } from "next";

import { MyReportsView } from "@/features/my-reports";
import { getT } from "@/features/locale/server";
import { NO_INDEX } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Báo cáo của tôi"),
    robots: NO_INDEX,
  };
}

export const dynamic = "force-dynamic";

export default function MyReportsPage() {
  return <MyReportsView />;
}
