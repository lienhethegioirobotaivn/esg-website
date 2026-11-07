import { redirect } from "next/navigation";

import { StatsEditor } from "@/features/about-admin/components/stats-editor";
import { getAdminStats } from "@/features/about/lib/content";
import { isAdmin } from "@/server/admin/session";

export const dynamic = "force-dynamic";

export default async function StatsAdminPage() {
  if (!(await isAdmin())) {
    redirect("/quan-tri");
  }
  const items = await getAdminStats();
  return <StatsEditor initial={items} />;
}
